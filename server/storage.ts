import {
  type User, type InsertUser,
  type Category, type InsertCategory,
  type InsertItem, type ItemWithCategory,
  type Movement, type InsertMovement, type MovementWithDetails,
  users, categories, items, movements, passwordResets, userActivity
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, asc, and, or, ilike, sql, count, isNull, lt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logWarn } from "./logger";

let _db: ReturnType<typeof drizzle> | undefined;
let _migrationChecked = false;
let _passwordResetsReady: Promise<void> | undefined;

function getDb() {
  if (_db) {
    return _db;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Throwing here will be caught by route try/catch (since it's not at module top-level anymore)
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const client = neon(url);
  _db = drizzle(client);

  // Garantir que a coluna deleted_at existe (migração automática) - apenas uma vez
  if (!_migrationChecked) {
    ensureDeletedAtColumn().catch(err => {
      logWarn("Warning: Could not ensure deleted_at column exists:", err);
    });
    _migrationChecked = true;
  }

  return _db;
}

// Garante que password_resets está no formato atual (token_hash de uso único).
// O formato antigo guardava um código de 6 dígitos em texto puro na coluna
// "code"; como a tabela só tem dados temporários, ela é recriada.
// Espelha migrations/password-resets-token-hash.sql.
async function ensurePasswordResetsTable() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const client = neon(url);
  await client`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'password_resets' AND column_name = 'token_hash'
      ) THEN
        DROP TABLE IF EXISTS password_resets;
        CREATE TABLE password_resets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
      END IF;
    END $$;
  `;
}

// As rotas de recuperação dependem da tabela nova, então aguardam a migração
// (diferente de deleted_at, que roda em segundo plano). Se falhar, a próxima
// chamada tenta de novo.
function passwordResetsReady(): Promise<void> {
  if (!_passwordResetsReady) {
    _passwordResetsReady = ensurePasswordResetsTable().catch((err) => {
      _passwordResetsReady = undefined;
      logWarn("Warning: Could not ensure password_resets table is up to date:", err);
    });
  }
  return _passwordResetsReady;
}

async function ensureDeletedAtColumn() {
  try {
    // Usar o client diretamente para evitar recursão
    const url = process.env.DATABASE_URL;
    if (!url) return;

    const client = neon(url);
    // Verificar se a coluna existe e criar se não existir
    await client`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'deleted_at'
        ) THEN
          ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;
          CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
        END IF;
      END $$;
    `;
  } catch (error) {
    // Se falhar, apenas logar (não quebrar a aplicação)
    logWarn("Warning: Could not ensure deleted_at column exists:", error);
  }
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getActiveUsersByUsernameOrEmail(usernameOrEmail: string): Promise<User[]>;
  getUsersForLogin(identifier: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<{ success: boolean; softDelete: boolean }>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;

  // Categories
  getCategory(id: string): Promise<Category | undefined>;
  getAllCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Items
  getItem(id: string): Promise<ItemWithCategory | undefined>;
  getItemByCode(code: string): Promise<ItemWithCategory | undefined>;
  getAllItems(): Promise<ItemWithCategory[]>;
  searchItems(query: string, categoryId?: string, status?: string): Promise<ItemWithCategory[]>;
  createItem(item: InsertItem): Promise<ItemWithCategory>;
  updateItem(id: string, item: Partial<InsertItem>): Promise<ItemWithCategory | undefined>;
  deleteItem(id: string): Promise<boolean>;
  getLowStockItems(): Promise<ItemWithCategory[]>;
  generateInternalCode(): Promise<string>;

  // Movements
  createMovement(movement: InsertMovement): Promise<Movement>;
  getMovements(itemId?: string, limit?: number): Promise<MovementWithDetails[]>;
  getDashboardStats(): Promise<{
    totalItems: number;
    lowStock: number;
    todayMovements: number;
    activeUsers: number;
  }>;
  getItemConsumption(): Promise<Array<{
    itemId: string;
    itemName: string;
    internalCode: string;
    categoryName: string;
    categoryIcon: string;
    totalConsumed: number;
    unit: string;
    totalEntradas: number;
    lastMovement: Date | null;
    currentStock: number;
  }>>;
  updateUserLastSeen(userId: string): Promise<void>;
  getOnlineUsers(windowMinutes?: number): Promise<Array<{
    id: string;
    username: string;
    role: string;
    lastSeenAt: Date;
  }>>

  // Password Resets
  getLatestPasswordResetCreatedAt(userId: string): Promise<Date | undefined>;
  createPasswordReset(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  consumePasswordReset(tokenHash: string): Promise<{ userId: string; expiresAt: Date } | undefined>;
  deletePasswordResetsForUser(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    // Permitir buscar usuários deletados também (para validações)
    const result = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Filtrar usuários deletados na busca por username (para login)
    const result = await getDb()
      .select()
      .from(users)
      .where(and(eq(users.username, username), isNull(users.deletedAt)))
      .limit(1);
    return result[0];
  }

  async getUsersForLogin(identifier: string): Promise<User[]> {
    // Login aceita usuário, e-mail ou matrícula (sem diferenciar maiúsculas).
    // Email e matrícula não são únicos, então pode haver mais de uma conta:
    // a rota confere a senha em cada candidata. Inativas entram para a rota
    // poder avisar "aguardando liberação" depois de a senha conferir.
    return getDb()
      .select()
      .from(users)
      .where(and(
        or(
          sql`lower(${users.username}) = lower(${identifier})`,
          sql`lower(${users.email}) = lower(${identifier})`,
          eq(users.matricula, identifier)
        ),
        isNull(users.deletedAt)
      ))
      .limit(5);
  }

  async getActiveUsersByUsernameOrEmail(usernameOrEmail: string): Promise<User[]> {
    // Recuperação de senha: só contas ativas e não excluídas (as mesmas que
    // podem fazer login). Email não é único, então pode haver mais de uma.
    return getDb()
      .select()
      .from(users)
      .where(and(
        or(
          eq(users.username, usernameOrEmail),
          sql`lower(${users.email}) = lower(${usernameOrEmail})`
        ),
        isNull(users.deletedAt),
        eq(users.isActive, true)
      ))
      .limit(5);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const result = await getDb().insert(users).values({
      ...insertUser,
      password: hashedPassword,
    }).returning();
    return result[0];
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const updateData = { ...user };

    // Remove password field if it's empty, null, or undefined
    if (!updateData.password || updateData.password.trim() === "") {
      delete updateData.password;
    } else {
      // Only hash if password is a non-empty string
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const result = await getDb().update(users).set(updateData).where(eq(users.id, id)).returning();
    return result[0];
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await getDb().update(users).set({ password: hashedPassword }).where(eq(users.id, id));
  }


  async getAllUsers(): Promise<User[]> {
    // Filtrar apenas usuários não deletados (deletedAt IS NULL)
    return await getDb()
      .select()
      .from(users)
      .where(isNull(users.deletedAt))
      .orderBy(asc(users.name));
  }

  async deleteUser(id: string): Promise<{ success: boolean; softDelete: boolean }> {
    try {
      // Verificar se o usuário tem movimentações
      const [movementCountResult] = await getDb()
        .select({ count: count() })
        .from(movements)
        .where(eq(movements.userId, id));

      const movementCount = movementCountResult?.count || 0;

      if (movementCount > 0) {
        // Se tem movimentações, fazer soft delete (marcar como deletado e desativar)
        // Isso mantém a integridade referencial e preserva o histórico
        const result = await getDb()
          .update(users)
          .set({
            isActive: false,
            deletedAt: sql`now()`
          })
          .where(eq(users.id, id))
          .returning();

        return { success: result.length > 0, softDelete: true };
      }

      // Se não tem movimentações, deletar fisicamente
      const result = await getDb().delete(users).where(eq(users.id, id)).returning();
      return { success: result.length > 0, softDelete: false };
    } catch (error: any) {
      // Se for erro de foreign key constraint do banco, fazer soft delete como fallback
      if (error?.code === "23503" || /foreign key constraint|violates foreign key/i.test(error?.message || "")) {
        const result = await getDb()
          .update(users)
          .set({
            isActive: false,
            deletedAt: sql`now()`
          })
          .where(eq(users.id, id))
          .returning();

        return { success: result.length > 0, softDelete: true };
      }
      // Relançar outros erros
      throw error;
    }
  }

  // Categories
  async getCategory(id: string): Promise<Category | undefined> {
    const result = await getDb().select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0];
  }

  async getAllCategories(): Promise<Category[]> {
    return await getDb().select().from(categories).orderBy(asc(categories.name));
  }

  async getCategoriesWithItemCount(): Promise<(Category & { itemCount: number })[]> {
    const result = await getDb()
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        icon: categories.icon,
        createdAt: categories.createdAt,
        itemCount: sql<number>`count(${items.id})::int`.as('itemCount'),
      })
      .from(categories)
      .leftJoin(items, eq(categories.id, items.categoryId))
      .groupBy(
        categories.id,
        categories.name,
        categories.description,
        categories.icon,
        categories.createdAt
      )
      .orderBy(asc(categories.name));

    return result;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await getDb().insert(categories).values(category).returning();
    return result[0];
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const result = await getDb().update(categories).set(category).where(eq(categories.id, id)).returning();
    return result[0];
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await getDb().delete(categories).where(eq(categories.id, id)).returning();
    return result.length > 0;
  }

  // Items
  async getItem(id: string): Promise<ItemWithCategory | undefined> {
    const result = await getDb().select({
      id: items.id,
      internalCode: items.internalCode,
      name: items.name,
      categoryId: items.categoryId,
      serialNumber: items.serialNumber,
      currentStock: items.currentStock,
      minStock: items.minStock,
      status: items.status,
      location: items.location,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
      category: categories,
    })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .where(eq(items.id, id))
      .limit(1);

    return result[0] as ItemWithCategory;
  }

  async getItemByCode(code: string): Promise<ItemWithCategory | undefined> {
    const sanitized = (code ?? "").trim();
    const result = await getDb().select({
      id: items.id,
      internalCode: items.internalCode,
      name: items.name,
      categoryId: items.categoryId,
      serialNumber: items.serialNumber,
      currentStock: items.currentStock,
      minStock: items.minStock,
      status: items.status,
      location: items.location,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
      category: categories,
    })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .where(eq(items.internalCode, sanitized))
      .limit(1);

    return result[0] as ItemWithCategory;
  }

  async getAllItems(): Promise<ItemWithCategory[]> {
    const result = await getDb().select({
      id: items.id,
      internalCode: items.internalCode,
      name: items.name,
      categoryId: items.categoryId,
      serialNumber: items.serialNumber,
      currentStock: items.currentStock,
      minStock: items.minStock,
      status: items.status,
      location: items.location,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
      category: categories,
    })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .orderBy(asc(items.name));

    return result as ItemWithCategory[];
  }

  async searchItems(query: string, categoryId?: string, status?: string): Promise<ItemWithCategory[]> {
    const conditions = [];

    // Filtro principal de busca por texto (nome, código, serial ou categoria)
    if (query) {
      const searchTerm = `%${query}%`;
      conditions.push(
        or(
          ilike(items.name, searchTerm),
          ilike(items.internalCode, searchTerm),
          ilike(items.serialNumber, searchTerm),
          ilike(categories.name, searchTerm)
        )
      );
    }

    // Filtro por ID da categoria
    if (categoryId) {
      conditions.push(eq(items.categoryId, categoryId));
    }

    // Filtro por status
    if (status) {
      conditions.push(eq(items.status, status as "disponivel" | "em-uso" | "manutencao" | "descartado"));
    }

    // Combina todas as condições com AND. Se não houver filtros, a busca retorna tudo.
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await getDb().select({
      id: items.id,
      internalCode: items.internalCode,
      name: items.name,
      categoryId: items.categoryId,
      serialNumber: items.serialNumber,
      currentStock: items.currentStock,
      minStock: items.minStock,
      status: items.status,
      location: items.location,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
      category: categories,
    })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .where(whereCondition)
      .orderBy(asc(items.name));

    return result as ItemWithCategory[];
  }

  async generateInternalCode(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const yearPrefix = currentYear.toString();

    // Get the highest number for this year
    const result = await getDb().select({
      code: items.internalCode
    })
      .from(items)
      .where(ilike(items.internalCode, `${yearPrefix}-%`))
      .orderBy(desc(items.internalCode))
      .limit(1);

    let nextNumber = 1;
    if (result.length > 0) {
      const lastCode = result[0].code;
      const lastNumber = parseInt(lastCode.split('-')[1]);
      nextNumber = lastNumber + 1;
    }

    return `${yearPrefix}-${nextNumber.toString().padStart(4, '0')}`;
  }

  async createItem(item: InsertItem): Promise<ItemWithCategory> {
    const internalCode = await this.generateInternalCode();
    const result = await getDb().insert(items).values({
      ...item,
      internalCode,
    }).returning();

    return await this.getItem(result[0].id) as ItemWithCategory;
  }

  async updateItem(id: string, item: Partial<InsertItem>): Promise<ItemWithCategory | undefined> {
    const result = await getDb().update(items).set({
      ...item,
      updatedAt: sql`now()`,
    }).where(eq(items.id, id)).returning();

    if (result.length === 0) return undefined;
    return await this.getItem(result[0].id);
  }

  async deleteItem(id: string): Promise<boolean> {
    const result = await getDb().delete(items).where(eq(items.id, id)).returning();
    return result.length > 0;
  }

  async getLowStockItems(): Promise<ItemWithCategory[]> {
    const result = await getDb().select({
      id: items.id,
      internalCode: items.internalCode,
      name: items.name,
      categoryId: items.categoryId,
      serialNumber: items.serialNumber,
      currentStock: items.currentStock,
      minStock: items.minStock,
      status: items.status,
      location: items.location,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
      category: categories,
    })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .where(sql`${items.currentStock} <= ${items.minStock}`)
      .orderBy(asc(items.currentStock));

    return result as ItemWithCategory[];
  }

  // Movements
  async createMovement(movement: InsertMovement): Promise<Movement> {
    const db = getDb();

    // Busca o item atual (sem transação, pois o driver HTTP do Neon limita TXs complexas)
    const [itemRow] = await db
      .select({
        id: items.id,
        currentStock: items.currentStock,
      })
      .from(items)
      .where(eq(items.id, movement.itemId));

    if (!itemRow) {
      throw new Error("Item not found");
    }

    const previousStock = itemRow.currentStock ?? 0;
    const computedNewStock = movement.type === "entrada"
      ? previousStock + movement.quantity
      : previousStock - movement.quantity;

    if (computedNewStock < 0) {
      throw new Error("Insufficient stock: operation would result in negative stock");
    }

    // Insere a movimentação usando os valores calculados no servidor
    const [inserted] = await db.insert(movements).values({
      ...movement,
      previousStock,
      newStock: computedNewStock,
    }).returning();

    // Atualiza o estoque do item
    await db.update(items).set({
      currentStock: computedNewStock,
      updatedAt: sql`now()`,
    }).where(eq(items.id, movement.itemId));

    return inserted as Movement;
  }

  async getMovements(itemId?: string, limit: number = 50): Promise<MovementWithDetails[]> {
    const baseSelect = getDb().select({
      id: movements.id,
      itemId: movements.itemId,
      userId: movements.userId,
      type: movements.type,
      quantity: movements.quantity,
      previousStock: movements.previousStock,
      newStock: movements.newStock,
      destination: movements.destination,
      observation: movements.observation,
      createdAt: movements.createdAt,
      item: items,
      user: users,
      category: categories,
    })
      .from(movements)
      .leftJoin(items, eq(movements.itemId, items.id))
      .leftJoin(users, eq(movements.userId, users.id))
      .leftJoin(categories, eq(items.categoryId, categories.id));

    const qb = itemId
      ? baseSelect.where(eq(movements.itemId, itemId))
      : baseSelect;

    const result = await qb
      .orderBy(desc(movements.createdAt))
      .limit(limit);

    return result as MovementWithDetails[];
  }

  async getDashboardStats(): Promise<{
    totalItems: number;
    lowStock: number;
    todayMovements: number;
    activeUsers: number;
  }> {
    // Tabela user_activity agora está no schema
    const [totalItemsResult] = await getDb().select({ count: count() }).from(items);

    const [lowStockResult] = await getDb().select({ count: count() })
      .from(items)
      .where(sql`${items.currentStock} <= ${items.minStock}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [todayMovementsResult] = await getDb().select({ count: count() })
      .from(movements)
      .where(sql`${movements.createdAt} >= ${today}`);

    // Usuários "online" por heartbeat: usuários com last_seen_at recente na tabela user_activity
    const activeUsersResult = await getDb().execute(
      sql`SELECT COUNT(*)::int AS count FROM user_activity WHERE last_seen_at >= now() - interval '10 minutes'`
    );
    const resultObj = activeUsersResult as unknown as { rows?: Array<{ count: string | number }> };
    const activeUsersRows = resultObj.rows ?? activeUsersResult;
    const activeCount = Array.isArray(activeUsersRows) ? activeUsersRows[0]?.count : 0;

    return {
      totalItems: totalItemsResult.count,
      lowStock: lowStockResult.count,
      todayMovements: todayMovementsResult.count,
      activeUsers: Number(activeCount) || 0,
    };
  }

  async getItemConsumption(): Promise<Array<{
    itemId: string;
    itemName: string;
    internalCode: string;
    categoryName: string;
    categoryIcon: string;
    totalConsumed: number;
    unit: string;
    totalEntradas: number;
    lastMovement: Date | null;
    currentStock: number;
  }>> {
    const execResult = await getDb().execute(sql`
      SELECT
        i.id AS "itemId",
        i.name AS "itemName",
        i.internal_code AS "internalCode",
        COALESCE(c.name, 'Sem Categoria') AS "categoryName",
        COALESCE(c.icon, 'fas fa-box') AS "categoryIcon",
        COALESCE(SUM(CASE WHEN m.type = 'saida' THEN m.quantity ELSE 0 END), 0)::int AS "totalConsumed",
        i.unit AS "unit",
        COALESCE(SUM(CASE WHEN m.type = 'entrada' THEN m.quantity ELSE 0 END), 0)::int AS "totalEntradas",
        MAX(m.created_at) AS "lastMovement",
        i.current_stock AS "currentStock"
      FROM items i
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN movements m ON m.item_id = i.id
      GROUP BY i.id, i.name, i.internal_code, c.name, c.icon, i.unit, i.current_stock
      ORDER BY "totalConsumed" DESC
    `);
    const resultObj = execResult as unknown as { rows?: Array<Record<string, unknown>> };
    const rows = resultObj.rows ?? execResult;
    return (Array.isArray(rows) ? rows : []).map((r) => ({
      itemId: String(r.itemId ?? r['itemId'] ?? ''),
      itemName: String(r.itemName ?? r['itemName'] ?? ''),
      internalCode: String(r.internalCode ?? r['internalCode'] ?? ''),
      categoryName: String(r.categoryName ?? r['categoryName'] ?? 'Sem Categoria'),
      categoryIcon: String(r.categoryIcon ?? r['categoryIcon'] ?? 'fas fa-box'),
      totalConsumed: Number(r.totalConsumed ?? r['totalConsumed'] ?? 0),
      unit: String(r.unit ?? 'un'),
      totalEntradas: Number(r.totalEntradas ?? r['totalEntradas'] ?? 0),
      lastMovement: r.lastMovement ? new Date(r.lastMovement as string | Date | number) : null,
      currentStock: Number(r.currentStock ?? r['currentStock'] ?? 0),
    }));
  }

  async getOnlineUsers(windowMinutes: number = 10): Promise<Array<{
    id: string;
    username: string;
    role: string;
    lastSeenAt: Date;
  }>> {
    // Tabela user_activity agora está no schema
    const execResult = await getDb().execute(sql`
      SELECT u.id, u.username, u.role, ua.last_seen_at AS "lastSeenAt"
      FROM user_activity ua
      JOIN ${users} u ON u.id = ua.user_id
      WHERE ua.last_seen_at >= now() - (interval '1 minute' * ${windowMinutes})
      ORDER BY ua.last_seen_at DESC
    `);
    const resultObj = execResult as unknown as { rows?: Array<Record<string, unknown>> };
    const rows = resultObj.rows ?? execResult;
    const out = (Array.isArray(rows) ? rows : []).map((r) => ({
      id: String(r.id),
      username: String(r.username),
      role: String(r.role),
      lastSeenAt: new Date((r.lastSeenAt ?? r.last_seen_at) as string | Date | number),
    }));
    return out;
  }

  async updateUserLastSeen(userId: string): Promise<void> {
    // Upsert usando Drizzle ORM
    await getDb()
      .insert(userActivity)
      .values({ userId, lastSeenAt: new Date() })
      .onConflictDoUpdate({
        target: userActivity.userId,
        set: { lastSeenAt: sql`EXCLUDED.last_seen_at` }
      });
  }


  // Password Resets
  async getLatestPasswordResetCreatedAt(userId: string): Promise<Date | undefined> {
    await passwordResetsReady();
    const result = await getDb()
      .select({ createdAt: passwordResets.createdAt })
      .from(passwordResets)
      .where(eq(passwordResets.userId, userId))
      .orderBy(desc(passwordResets.createdAt))
      .limit(1);
    return result[0]?.createdAt;
  }

  async createPasswordReset(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await passwordResetsReady();
    // Um único token válido por usuário: um pedido novo invalida os anteriores.
    // Aproveita para limpar tokens expirados de qualquer usuário.
    await getDb()
      .delete(passwordResets)
      .where(or(eq(passwordResets.userId, userId), lt(passwordResets.expiresAt, new Date())));

    await getDb().insert(passwordResets).values({ userId, tokenHash, expiresAt });
  }

  async consumePasswordReset(tokenHash: string): Promise<{ userId: string; expiresAt: Date } | undefined> {
    await passwordResetsReady();
    // DELETE ... RETURNING é atômico: duas requisições simultâneas com o mesmo
    // token não conseguem usá-lo duas vezes. Quem chama valida a expiração.
    const result = await getDb()
      .delete(passwordResets)
      .where(eq(passwordResets.tokenHash, tokenHash))
      .returning({ userId: passwordResets.userId, expiresAt: passwordResets.expiresAt });
    return result[0];
  }

  async deletePasswordResetsForUser(userId: string): Promise<void> {
    await passwordResetsReady();
    await getDb().delete(passwordResets).where(eq(passwordResets.userId, userId));
  }
}

export const storage = new DatabaseStorage();
