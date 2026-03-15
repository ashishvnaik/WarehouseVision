import { 
  users,
  inventoryItems,
  analysisResults,
  alerts,
  prompts,
  settings,
  inventoryItemCounts,
  trainingExamples,
  type User, 
  type InsertUser,
  type InventoryItem,
  type InsertInventoryItem,
  type AnalysisResult,
  type InsertAnalysisResult,
  type Alert,
  type InsertAlert,
  type Prompt,
  type InsertPrompt,
  type Setting,
  type InsertSetting,
  type InventoryItemCount,
  type InsertInventoryItemCount,
  type TrainingExample,
  type InsertTrainingExample
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getInventoryItems(excludeImages?: boolean): Promise<InventoryItem[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, updates: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: string): Promise<boolean>;
  clearInventory(): Promise<void>;
  
  getAnalysisResults(itemId?: string): Promise<AnalysisResult[]>;
  getAnalysisResultById(id: string): Promise<AnalysisResult | undefined>;
  getAnalysisResultByImageHash(imageHash: string): Promise<AnalysisResult[]>;
  getAnalysisResultsSummary(itemId?: string, limit?: number): Promise<Omit<AnalysisResult, 'imageUrl'>[]>;
  createAnalysisResult(result: InsertAnalysisResult): Promise<AnalysisResult>;
  
  getAlerts(dismissed?: boolean): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  dismissAlert(id: string): Promise<boolean>;
  dismissAllAlerts(): Promise<number>;
  
  getPrompts(): Promise<Prompt[]>;
  getPrompt(id: string): Promise<Prompt | undefined>;
  getPromptByVersion(version: string): Promise<Prompt | undefined>;
  getDefaultPrompt(): Promise<Prompt | undefined>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  updatePrompt(id: string, updates: Partial<InsertPrompt>): Promise<Prompt | undefined>;
  deletePrompt(id: string): Promise<boolean>;
  setDefaultPrompt(id: string): Promise<boolean>;
  
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string): Promise<Setting>;
  getAllSettings(): Promise<Setting[]>;
  
  getItemCountHistory(itemId: string): Promise<InventoryItemCount[]>;
  getAllItemCountHistory(): Promise<InventoryItemCount[]>;
  upsertItemCount(count: InsertInventoryItemCount): Promise<InventoryItemCount>;
  deleteItemCountByDate(itemId: string, photoDate: string): Promise<boolean>;
  getInventoryItemsWithHistory(): Promise<(InventoryItem & { countHistory: InventoryItemCount[], latestCountingMethod?: string })[]>;
  
  getTrainingExamples(activeOnly?: boolean): Promise<TrainingExample[]>;
  getTrainingExample(id: string): Promise<TrainingExample | undefined>;
  createTrainingExample(example: InsertTrainingExample): Promise<TrainingExample>;
  updateTrainingExample(id: string, updates: Partial<InsertTrainingExample>): Promise<TrainingExample | undefined>;
  deleteTrainingExample(id: string): Promise<boolean>;

  deleteAnalysisResult(id: string): Promise<boolean>;
  mergeInventoryItems(sourceId: string, targetId: string, canonicalName: string, conflictResolution: 'source' | 'target' | 'max'): Promise<InventoryItem>;
  verifyItemCount(itemId: string, photoDate: string): Promise<InventoryItemCount | undefined>;
}

export class DatabaseStorage implements IStorage {
  private initPromise: Promise<void> | null = null;

  private async ensureInitialized() {
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this.seedDefaultPrompt();
    await this.initPromise;
  }

  private async seedDefaultPrompt() {
    try {
      await db.insert(prompts).values({
        version: 'v1.0',
        name: 'Default Detection Prompt',
        description: 'Original warehouse inventory detection prompt with specific product identification',
        isDefault: 1,
        content: `You are a warehouse inventory analyst. Carefully examine this image and identify SPECIFIC products with maximum detail.

IMPORTANT INSTRUCTIONS:
1. Identify the EXACT product name, brand, and type (e.g., "Smartwater 1L bottles", "Coca-Cola 12oz cans", "iPhone 15 Pro boxes")
2. DO NOT use generic terms like "boxes", "pallets", or "containers" - identify what's INSIDE or what the specific product is
3. Count items at multiple levels when applicable:
   - If there are boxes containing items, count BOTH the boxes AND estimate items per box
   - Example: "10 cases of Smartwater (24 bottles per case)" not just "boxes"
4. Include product details: brand names, sizes, packaging types, colors, variants
5. Be as specific as possible - read any visible text, labels, or logos

For each distinct product type detected, provide:
- itemType: SPECIFIC product name with brand and details (e.g., "Smartwater 1-liter bottles in 24-pack cases")
- count: Total number of this product type (if boxes, count boxes; also mention items per box in itemType)
- confidence: Your confidence level (0-100)
- location: Where in the image/warehouse (if distinguishable)

Return your response as a JSON object with this exact structure:
{
  "detectedItems": [
    {
      "itemType": "Specific product name with brand and packaging details",
      "count": number,
      "confidence": number,
      "location": "string or null"
    }
  ],
  "totalItems": number,
  "imageDescription": "Detailed description of what products you see"
}

EXAMPLE GOOD RESPONSE:
{
  "detectedItems": [
    {
      "itemType": "Smartwater 1L bottles (24-pack cases)",
      "count": 12,
      "confidence": 95,
      "location": "center shelving unit"
    },
    {
      "itemType": "Red Bull Energy Drink 8.4oz cans",
      "count": 48,
      "confidence": 90,
      "location": "left pallet"
    }
  ],
  "totalItems": 60,
  "imageDescription": "Warehouse showing 12 cases of Smartwater (approximately 288 bottles total) and 48 Red Bull cans on left pallet"
}

Be thorough, specific, and accurate. Read all visible text and branding.`,
      }).onConflictDoNothing({ target: prompts.version });
    } catch (error) {
      console.error('Error seeding default prompt:', error);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getInventoryItems(excludeImages: boolean = false): Promise<InventoryItem[]> {
    if (excludeImages) {
      // Select all fields except imageUrl for faster queries
      const items = await db.select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        sku: inventoryItems.sku,
        category: inventoryItems.category,
        location: inventoryItems.location,
        currentCount: inventoryItems.currentCount,
        minThreshold: inventoryItems.minThreshold,
        userInput: inventoryItems.userInput,
        lastUpdated: inventoryItems.lastUpdated,
      }).from(inventoryItems);
      // Return with imageUrl as null to match the type
      return items.map(item => ({ ...item, imageUrl: null }));
    }
    return await db.select().from(inventoryItems);
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item || undefined;
  }

  async createInventoryItem(insertItem: InsertInventoryItem): Promise<InventoryItem> {
    const [item] = await db.insert(inventoryItems).values(insertItem).returning();
    
    if (item.currentCount < item.minThreshold) {
      await this.createAlert({
        itemId: item.id,
        severity: item.currentCount === 0 ? 'critical' : 'warning',
        message: `${item.name} is ${item.currentCount === 0 ? 'out of stock' : 'low on stock'}`,
      });
    }
    
    return item;
  }

  async updateInventoryItem(id: string, updates: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const [updated] = await db
      .update(inventoryItems)
      .set(updates)
      .where(eq(inventoryItems.id, id))
      .returning();
    
    if (!updated) return undefined;
    
    if (updated.currentCount < updated.minThreshold) {
      const existingAlerts = await db
        .select()
        .from(alerts)
        .where(and(eq(alerts.itemId, id), eq(alerts.dismissed, 0)));
      
      if (existingAlerts.length === 0) {
        await this.createAlert({
          itemId: id,
          severity: updated.currentCount === 0 ? 'critical' : 'warning',
          message: `${updated.name} is ${updated.currentCount === 0 ? 'out of stock' : 'low on stock'}`,
        });
      }
    } else {
      await db
        .update(alerts)
        .set({ dismissed: 1 })
        .where(and(eq(alerts.itemId, id), eq(alerts.dismissed, 0)));
    }
    
    return updated;
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    const result = await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async clearInventory(): Promise<void> {
    await db.delete(inventoryItems);
    await db.delete(analysisResults);
    await db.delete(alerts);
  }

  async getAnalysisResults(itemId?: string): Promise<AnalysisResult[]> {
    if (itemId) {
      return await db.select().from(analysisResults).where(eq(analysisResults.itemId, itemId));
    }
    return await db.select().from(analysisResults);
  }

  // Lightweight version that excludes large imageUrl field to prevent memory issues
  async getAnalysisResultsSummary(itemId?: string, limit?: number): Promise<Omit<AnalysisResult, 'imageUrl'>[]> {
    const query = db.select({
      id: analysisResults.id,
      itemId: analysisResults.itemId,
      imageHash: analysisResults.imageHash,
      detectedCount: analysisResults.detectedCount,
      confidence: analysisResults.confidence,
      annotations: analysisResults.annotations,
      timestamp: analysisResults.timestamp,
      modelType: analysisResults.modelType,
      modelName: analysisResults.modelName,
      isTest: analysisResults.isTest,
    }).from(analysisResults);

    if (itemId) {
      const results = await query.where(eq(analysisResults.itemId, itemId)).orderBy(desc(analysisResults.timestamp));
      return limit ? results.slice(0, limit) : results;
    }
    const results = await query.orderBy(desc(analysisResults.timestamp));
    return limit ? results.slice(0, limit) : results;
  }

  async getAnalysisResultById(id: string): Promise<AnalysisResult | undefined> {
    const [result] = await db.select().from(analysisResults).where(eq(analysisResults.id, id));
    return result || undefined;
  }

  async getAnalysisResultByImageHash(imageHash: string): Promise<AnalysisResult[]> {
    return await db.select().from(analysisResults).where(eq(analysisResults.imageHash, imageHash));
  }

  async createAnalysisResult(insertResult: InsertAnalysisResult): Promise<AnalysisResult> {
    const [result] = await db.insert(analysisResults).values(insertResult).returning();
    
    const item = await this.getInventoryItem(insertResult.itemId);
    if (item) {
      await this.updateInventoryItem(item.id, {
        currentCount: insertResult.detectedCount,
      });
    }
    
    return result;
  }

  async getAlerts(dismissed?: boolean): Promise<Alert[]> {
    if (dismissed !== undefined) {
      return await db.select().from(alerts).where(eq(alerts.dismissed, dismissed ? 1 : 0));
    }
    return await db.select().from(alerts);
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db.insert(alerts).values(insertAlert).returning();
    return alert;
  }

  async dismissAlert(id: string): Promise<boolean> {
    const result = await db.update(alerts).set({ dismissed: 1 }).where(eq(alerts.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async dismissAllAlerts(): Promise<number> {
    const result = await db.update(alerts).set({ dismissed: 1 }).where(eq(alerts.dismissed, 0));
    return result.rowCount ?? 0;
  }

  async getPrompts(): Promise<Prompt[]> {
    await this.ensureInitialized();
    return await db.select().from(prompts).orderBy(desc(prompts.createdAt));
  }

  async getPrompt(id: string): Promise<Prompt | undefined> {
    await this.ensureInitialized();
    const [prompt] = await db.select().from(prompts).where(eq(prompts.id, id));
    return prompt || undefined;
  }

  async getPromptByVersion(version: string): Promise<Prompt | undefined> {
    await this.ensureInitialized();
    const [prompt] = await db.select().from(prompts).where(eq(prompts.version, version));
    return prompt || undefined;
  }

  async getDefaultPrompt(): Promise<Prompt | undefined> {
    await this.ensureInitialized();
    const [prompt] = await db.select().from(prompts).where(eq(prompts.isDefault, 1));
    return prompt || undefined;
  }

  async createPrompt(insertPrompt: InsertPrompt): Promise<Prompt> {
    await this.ensureInitialized();
    const [prompt] = await db.insert(prompts).values(insertPrompt).returning();
    return prompt;
  }

  async updatePrompt(id: string, updates: Partial<InsertPrompt>): Promise<Prompt | undefined> {
    await this.ensureInitialized();
    const [updated] = await db
      .update(prompts)
      .set(updates)
      .where(eq(prompts.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePrompt(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db.delete(prompts).where(eq(prompts.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async setDefaultPrompt(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const prompt = await this.getPrompt(id);
    if (!prompt) return false;
    
    await db.update(prompts).set({ isDefault: 0 });
    await db.update(prompts).set({ isDefault: 1 }).where(eq(prompts.id, id));
    
    return true;
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(settings).values({ key, value }).returning();
    return created;
  }

  async getAllSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  async getItemCountHistory(itemId: string): Promise<InventoryItemCount[]> {
    return await db
      .select()
      .from(inventoryItemCounts)
      .where(eq(inventoryItemCounts.itemId, itemId))
      .orderBy(asc(inventoryItemCounts.photoDate));
  }

  async getAllItemCountHistory(): Promise<InventoryItemCount[]> {
    return await db
      .select()
      .from(inventoryItemCounts)
      .orderBy(asc(inventoryItemCounts.photoDate));
  }

  async upsertItemCount(count: InsertInventoryItemCount): Promise<InventoryItemCount> {
    const existing = await db
      .select()
      .from(inventoryItemCounts)
      .where(
        and(
          eq(inventoryItemCounts.itemId, count.itemId),
          eq(inventoryItemCounts.photoDate, count.photoDate)
        )
      );

    if (existing.length > 0) {
      const [updated] = await db
        .update(inventoryItemCounts)
        .set({ absoluteCount: count.absoluteCount, sourceAnalysisId: count.sourceAnalysisId })
        .where(eq(inventoryItemCounts.id, existing[0].id))
        .returning();
      
      await this.updateCurrentCountFromHistory(count.itemId);
      return updated;
    }

    const [created] = await db
      .insert(inventoryItemCounts)
      .values(count)
      .returning();
    
    await this.updateCurrentCountFromHistory(count.itemId);
    return created;
  }

  async deleteItemCountByDate(itemId: string, photoDate: string): Promise<boolean> {
    const result = await db
      .delete(inventoryItemCounts)
      .where(
        and(
          eq(inventoryItemCounts.itemId, itemId),
          eq(inventoryItemCounts.photoDate, photoDate)
        )
      );
    
    if (result.rowCount && result.rowCount > 0) {
      await this.updateCurrentCountFromHistory(itemId);
      return true;
    }
    return false;
  }

  private async updateCurrentCountFromHistory(itemId: string): Promise<void> {
    const history = await this.getItemCountHistory(itemId);
    if (history.length > 0) {
      const latestCount = history[history.length - 1].absoluteCount;
      await this.updateInventoryItem(itemId, { currentCount: latestCount });
    }
  }

  async getInventoryItemsWithHistory(): Promise<(InventoryItem & { countHistory: (InventoryItemCount & { countingMethod?: string })[] })[]> {
    // Exclude images for faster loading - the history view doesn't need full base64 images
    const items = await this.getInventoryItems(true);
    const allCounts = await this.getAllItemCountHistory();
    
    // Get only id and annotations (excluding large imageUrl) to extract counting method per analysis
    const allAnalysis = await db
      .select({
        id: analysisResults.id,
        annotations: analysisResults.annotations
      })
      .from(analysisResults);
    
    // Build a map of analysisId -> countingMethod
    const countingMethodMap = new Map<string, string>();
    for (const analysis of allAnalysis) {
      if (analysis.annotations) {
        try {
          const annotations = JSON.parse(analysis.annotations);
          if (annotations.countingMethod) {
            countingMethodMap.set(analysis.id, annotations.countingMethod);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
    
    return items.map(item => ({
      ...item,
      countHistory: allCounts
        .filter(c => c.itemId === item.id)
        .map(c => ({
          ...c,
          countingMethod: c.sourceAnalysisId ? countingMethodMap.get(c.sourceAnalysisId) : undefined
        }))
    }));
  }

  async getTrainingExamples(activeOnly?: boolean): Promise<TrainingExample[]> {
    if (activeOnly) {
      return await db.select().from(trainingExamples).where(eq(trainingExamples.isActive, 1)).orderBy(desc(trainingExamples.createdAt));
    }
    return await db.select().from(trainingExamples).orderBy(desc(trainingExamples.createdAt));
  }

  async getTrainingExample(id: string): Promise<TrainingExample | undefined> {
    const [example] = await db.select().from(trainingExamples).where(eq(trainingExamples.id, id));
    return example || undefined;
  }

  async createTrainingExample(insertExample: InsertTrainingExample): Promise<TrainingExample> {
    const [example] = await db.insert(trainingExamples).values(insertExample).returning();
    return example;
  }

  async updateTrainingExample(id: string, updates: Partial<InsertTrainingExample>): Promise<TrainingExample | undefined> {
    const [updated] = await db
      .update(trainingExamples)
      .set(updates)
      .where(eq(trainingExamples.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTrainingExample(id: string): Promise<boolean> {
    const result = await db.delete(trainingExamples).where(eq(trainingExamples.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteAnalysisResult(id: string): Promise<boolean> {
    const [result] = await db.select().from(analysisResults).where(eq(analysisResults.id, id));
    if (!result) return false;
    const itemId = result.itemId;
    // Delete linked count row
    await db.delete(inventoryItemCounts).where(eq(inventoryItemCounts.sourceAnalysisId, id));
    // Delete analysis result
    await db.delete(analysisResults).where(eq(analysisResults.id, id));
    // Recalculate current count
    await this.updateCurrentCountFromHistory(itemId);
    return true;
  }

  async mergeInventoryItems(
    sourceId: string,
    targetId: string,
    canonicalName: string,
    conflictResolution: 'source' | 'target' | 'max'
  ): Promise<InventoryItem> {
    const sourceCounts = await this.getItemCountHistory(sourceId);
    for (const sourceCount of sourceCounts) {
      const [existingTarget] = await db
        .select()
        .from(inventoryItemCounts)
        .where(and(eq(inventoryItemCounts.itemId, targetId), eq(inventoryItemCounts.photoDate, sourceCount.photoDate)));
      if (existingTarget) {
        let keepCount: number;
        if (conflictResolution === 'source') keepCount = sourceCount.absoluteCount;
        else if (conflictResolution === 'target') keepCount = existingTarget.absoluteCount;
        else keepCount = Math.max(sourceCount.absoluteCount, existingTarget.absoluteCount);
        await db
          .update(inventoryItemCounts)
          .set({ absoluteCount: keepCount })
          .where(eq(inventoryItemCounts.id, existingTarget.id));
        await db.delete(inventoryItemCounts).where(eq(inventoryItemCounts.id, sourceCount.id));
      } else {
        await db
          .update(inventoryItemCounts)
          .set({ itemId: targetId })
          .where(eq(inventoryItemCounts.id, sourceCount.id));
      }
    }
    // Reassign analysis results
    await db
      .update(analysisResults)
      .set({ itemId: targetId })
      .where(eq(analysisResults.itemId, sourceId));
    // Rename target
    await db
      .update(inventoryItems)
      .set({ name: canonicalName })
      .where(eq(inventoryItems.id, targetId));
    // Delete source item
    await db.delete(inventoryItems).where(eq(inventoryItems.id, sourceId));
    // Recalculate currentCount
    await this.updateCurrentCountFromHistory(targetId);
    const [updated] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, targetId));
    return updated;
  }

  async verifyItemCount(itemId: string, photoDate: string): Promise<InventoryItemCount | undefined> {
    const [existing] = await db
      .select()
      .from(inventoryItemCounts)
      .where(and(eq(inventoryItemCounts.itemId, itemId), eq(inventoryItemCounts.photoDate, photoDate)));
    if (!existing) return undefined;
    const [updated] = await db
      .update(inventoryItemCounts)
      .set({ verifiedAt: new Date() })
      .where(eq(inventoryItemCounts.id, existing.id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
