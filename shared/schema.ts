import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, date, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  category: text("category").notNull(),
  minThreshold: integer("min_threshold").notNull().default(10),
  currentCount: integer("current_count").notNull().default(0),
  location: text("location").notNull(),
  imageUrl: text("image_url"),
  userInput: text("user_input"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const analysisResults = pgTable("analysis_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").notNull(),
  imageUrl: text("image_url").notNull(),
  imageHash: text("image_hash").notNull(),
  detectedCount: integer("detected_count").notNull(),
  confidence: integer("confidence").notNull(),
  modelType: text("model_type").notNull().default("llm"),
  modelName: text("model_name").notNull().default("gpt-4o"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  annotations: text("annotations"),
  isTest: integer("is_test").notNull().default(0),
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").notNull(),
  severity: text("severity").notNull(),
  message: text("message").notNull(),
  dismissed: integer("dismissed").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const prompts = pgTable("prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  version: text("version").notNull().unique(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  description: text("description"),
  isDefault: integer("is_default").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const trainingExamples = pgTable("training_examples", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  detectedItems: text("detected_items").notNull(),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inventoryItemCounts = pgTable("inventory_item_counts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").notNull(),
  photoDate: date("photo_date").notNull(),
  absoluteCount: integer("absolute_count").notNull(),
  sourceAnalysisId: varchar("source_analysis_id"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueItemDate: unique().on(table.itemId, table.photoDate),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  lastUpdated: true,
});

export const insertAnalysisResultSchema = createInsertSchema(analysisResults).omit({
  id: true,
  timestamp: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  dismissed: true,
});

export const insertPromptSchema = createInsertSchema(prompts).omit({
  id: true,
  createdAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertInventoryItemCountSchema = createInsertSchema(inventoryItemCounts).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingExampleSchema = createInsertSchema(trainingExamples).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

export type InsertAnalysisResult = z.infer<typeof insertAnalysisResultSchema>;
export type AnalysisResult = typeof analysisResults.$inferSelect;

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type Prompt = typeof prompts.$inferSelect;

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

export type InsertInventoryItemCount = z.infer<typeof insertInventoryItemCountSchema>;
export type InventoryItemCount = typeof inventoryItemCounts.$inferSelect;

export type InsertTrainingExample = z.infer<typeof insertTrainingExampleSchema>;
export type TrainingExample = typeof trainingExamples.$inferSelect;

// Chat models for Gemini integration
export * from "./models/chat";
