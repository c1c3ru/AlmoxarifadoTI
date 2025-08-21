import { 
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Item, type InsertItem, type ItemWithCategory,
  type Movement, type InsertMovement, type MovementWithDetails,
  users, categories, items, movements
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, asc, and, or, ilike, sql, count } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

let _db: ReturnType<typeof drizzle> | undefined;
function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Throwing here will be caught by route try/catch (since it's not at module top-level anymore)
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const client = neon(url);
  _db = drizzle(client);
  return _db;
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
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
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await getDb().select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
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
    let updateData = { ...user };
    if (user.password) {
      updateData.password = await bcrypt.hash(user.password, 10);
    }
    
    const result = await getDb().update(users).set(updateData).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await getDb().select().from(users).orderBy(asc(users.name));
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
    .where(eq(items.internalCode, code))
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
    .orderBy(desc(items.createdAt));
    
    return result as ItemWithCategory[];
  }

  async searchItems(query: string, categoryId?: string, status?: string): Promise<ItemWithCategory[]> {
    let whereCondition = or(
      ilike(items.name, `%${query}%`),
      ilike(items.internalCode, `%${query}%`)
    );

    if (categoryId) {
      whereCondition = and(whereCondition, eq(items.categoryId, categoryId));
    }

    if (status) {
      whereCondition = and(whereCondition, eq(items.status, status as any));
    }

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
    .orderBy(desc(items.createdAt));
    
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
    const result = await getDb().insert(movements).values(movement).returning();
    
    // Update item stock
    const newStock = movement.type === "entrada" 
      ? movement.previousStock + movement.quantity
      : movement.previousStock - movement.quantity;
      
    await getDb().update(items).set({
      currentStock: newStock,
      updatedAt: sql`now()`,
    }).where(eq(items.id, movement.itemId));
    
    return result[0];
  }

  async getMovements(itemId?: string, limit: number = 50): Promise<MovementWithDetails[]> {
    let whereCondition = undefined;
    if (itemId) {
      whereCondition = eq(movements.itemId, itemId);
    }

    const result = await getDb().select({
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
    .leftJoin(categories, eq(items.categoryId, categories.id))
    .where(whereCondition)
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
    const [totalItemsResult] = await getDb().select({ count: count() }).from(items);
    
    const [lowStockResult] = await getDb().select({ count: count() })
      .from(items)
      .where(sql`${items.currentStock} <= ${items.minStock}`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [todayMovementsResult] = await getDb().select({ count: count() })
      .from(movements)
      .where(sql`${movements.createdAt} >= ${today}`);
    
    const [activeUsersResult] = await getDb().select({ count: count() })
      .from(users)
      .where(eq(users.isActive, true));
    
    return {
      totalItems: totalItemsResult.count,
      lowStock: lowStockResult.count,
      todayMovements: todayMovementsResult.count,
      activeUsers: activeUsersResult.count,
    };
  }
}

export const storage = new DatabaseStorage();
