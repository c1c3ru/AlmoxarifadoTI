import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { ALLOWED_ADMIN_MATRICULAS } from "./allowed-admins";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  // Email institucional do usuário (obrigatório)
  email: text("email").notNull(),
  // Matrícula do usuário (única e obrigatória)
  matricula: text("matricula").notNull().unique(),
  role: text("role", { enum: ["admin", "tech"] }).notNull().default("tech"),
  isActive: boolean("is_active").notNull().default(true),
  deletedAt: timestamp("deleted_at"), // Timestamp de quando foi deletado (soft delete)
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  icon: text("icon").notNull().default("fas fa-box"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const items = pgTable("items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  internalCode: text("internal_code").notNull().unique(),
  name: text("name").notNull(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  serialNumber: text("serial_number"),
  currentStock: integer("current_stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(0),
  status: text("status", {
    enum: ["disponivel", "em-uso", "manutencao", "descartado"]
  }).notNull().default("disponivel"),
  location: text("location"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const movements = pgTable("movements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: uuid("item_id").references(() => items.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: text("type", { enum: ["entrada", "saida"] }).notNull(),
  quantity: integer("quantity").notNull(),
  previousStock: integer("previous_stock"),
  newStock: integer("new_stock"),
  destination: text("destination"),
  observation: text("observation"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const passwordResets = pgTable("password_resets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const userActivity = pgTable("user_activity", {
  userId: uuid("user_id").primaryKey().references(() => users.id).notNull(),
  lastSeenAt: timestamp("last_seen_at").notNull().default(sql`now()`),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).superRefine((data, ctx) => {
  const role = data.role || "tech";
  const matricula = data.matricula;

  if (role === "tech" && matricula.length !== 14) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Matrícula de técnico deve ter 14 dígitos",
      path: ["matricula"],
    });
  }

  if (role === "admin" && !ALLOWED_ADMIN_MATRICULAS.includes(matricula)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Matrícula não autorizada para perfil de administrador",
      path: ["matricula"],
    });
  }
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  internalCode: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMovementSchema = createInsertSchema(movements).omit({
  id: true,
  createdAt: true,
  previousStock: true,
  newStock: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export type Movement = typeof movements.$inferSelect;
export type InsertMovement = z.infer<typeof insertMovementSchema>;

// Extended types for API responses
export type ItemWithCategory = Item & {
  category: Category;
};

export type MovementWithDetails = Movement & {
  item: Item;
  user: User;
  category: Category;
};
