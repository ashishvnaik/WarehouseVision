import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { modelService, AVAILABLE_MODELS, type UserInstruction } from "./models";
import { insertInventoryItemSchema, insertAlertSchema, insertPromptSchema, insertTrainingExampleSchema } from "@shared/schema";
import { createHash } from "crypto";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

type Role = "operator" | "supervisor" | "programmer" | "superuser";

function requireAuth(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.session?.role as Role | undefined;
    if (!role) return res.status(401).json({ error: "Authentication required" });
    if (!allowedRoles.includes(role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

const requireAnyRole        = requireAuth(["operator", "supervisor", "programmer", "superuser"]);
const requireSupervisorPlus = requireAuth(["supervisor", "superuser"]);
const requireProgrammerPlus = requireAuth(["programmer", "superuser"]);
const requireSuperUser      = requireAuth(["superuser"]);

export async function registerRoutes(app: Express): Promise<Server> {
  // Lightweight health check for Railway (no DB dependency)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // ─── Auth Routes ───────────────────────────────────────────────────────────

  app.post("/api/auth/login", (req, res) => {
    const { role, password } = req.body as { role?: string; password?: string };
    const validRoles: Role[] = ["operator", "supervisor", "programmer", "superuser"];
    if (!role || !validRoles.includes(role as Role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const envKey = `ROLE_${role.toUpperCase()}_PASSWORD`;
    const expected = process.env[envKey];
    if (!expected) {
      return res.status(500).json({ error: "Role not configured" });
    }
    if (password !== expected) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    req.session.role = role as Role;
    req.session.testingMode = false;
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: "Failed to save session" });
      res.json({ role, testingMode: false });
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {});
    res.json({ success: true });
  });

  app.get("/api/auth/me", (req, res) => {
    const role = req.session?.role;
    if (!role) return res.status(401).json({ error: "Not authenticated" });
    res.json({ role, testingMode: req.session.testingMode ?? false });
  });

  app.post("/api/auth/testing-mode", requireAuth(["programmer"]), (req, res) => {
    const { enabled } = req.body as { enabled?: boolean };
    req.session.testingMode = !!enabled;
    res.json({ testingMode: req.session.testingMode });
  });

  // ─── Inventory Routes ─────────────────────────────────────────────────────

  app.get("/api/inventory", requireSupervisorPlus, async (req, res) => {
    try {
      // Exclude images by default for faster loading (88MB+ of image data)
      const includeImages = req.query.includeImages === 'true';
      const items = await storage.getInventoryItems(!includeImages);
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/:id", requireSupervisorPlus, async (req, res) => {
    try {
      const item = await storage.getInventoryItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching item:", error);
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  app.post("/api/inventory", requireSupervisorPlus, async (req, res) => {
    try {
      const validatedData = insertInventoryItemSchema.parse(req.body);
      const item = await storage.createInventoryItem(validatedData);
      res.json(item);
    } catch (error) {
      console.error("Error creating item:", error);
      res.status(400).json({ error: "Invalid item data" });
    }
  });

  app.patch("/api/inventory/:id", requireSupervisorPlus, async (req, res) => {
    try {
      const item = await storage.updateInventoryItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating item:", error);
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  app.delete("/api/inventory/:id", requireSupervisorPlus, async (req, res) => {
    try {
      const deleted = await storage.deleteInventoryItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting item:", error);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  app.post("/api/inventory/clear", requireSuperUser, async (req, res) => {
    try {
      await storage.clearInventory();
      res.json({ success: true, message: "Inventory cleared successfully" });
    } catch (error) {
      console.error("Error clearing inventory:", error);
      res.status(500).json({ error: "Failed to clear inventory" });
    }
  });

  app.get("/api/inventory-with-history", requireSupervisorPlus, async (req, res) => {
    try {
      const itemsWithHistory = await storage.getInventoryItemsWithHistory();
      res.json(itemsWithHistory);
    } catch (error) {
      console.error("Error fetching inventory with history:", error);
      res.status(500).json({ error: "Failed to fetch inventory with history" });
    }
  });

  app.delete("/api/inventory/:itemId/counts/:photoDate", requireSupervisorPlus, async (req, res) => {
    try {
      const { itemId, photoDate } = req.params;
      const deleted = await storage.deleteItemCountByDate(itemId, photoDate);
      if (!deleted) {
        return res.status(404).json({ error: "Count entry not found for this item and date" });
      }
      res.json({ success: true, message: "Count entry deleted successfully" });
    } catch (error) {
      console.error("Error deleting count entry:", error);
      res.status(500).json({ error: "Failed to delete count entry" });
    }
  });

  app.get("/api/inventory/:itemId/counts", requireSupervisorPlus, async (req, res) => {
    try {
      const history = await storage.getItemCountHistory(req.params.itemId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching item count history:", error);
      res.status(500).json({ error: "Failed to fetch item count history" });
    }
  });

  // ─── Supervisor Feature Routes ────────────────────────────────────────────

  app.post("/api/inventory/merge", requireSupervisorPlus, async (req, res) => {
    try {
      const { sourceId, targetId, canonicalName, conflictResolution = "max" } = req.body as {
        sourceId?: string; targetId?: string; canonicalName?: string;
        conflictResolution?: "source" | "target" | "max";
      };
      if (!sourceId || !targetId || !canonicalName) {
        return res.status(400).json({ error: "sourceId, targetId, and canonicalName are required" });
      }
      if (sourceId === targetId) {
        return res.status(400).json({ error: "sourceId and targetId must be different" });
      }
      const [src, tgt] = await Promise.all([
        storage.getInventoryItem(sourceId),
        storage.getInventoryItem(targetId),
      ]);
      if (!src) return res.status(404).json({ error: "Source item not found" });
      if (!tgt) return res.status(404).json({ error: "Target item not found" });
      const merged = await storage.mergeInventoryItems(sourceId, targetId, canonicalName, conflictResolution);
      res.json(merged);
    } catch (error) {
      console.error("Error merging inventory items:", error);
      res.status(500).json({ error: "Failed to merge items" });
    }
  });

  app.post("/api/inventory/:itemId/counts/:photoDate/verify", requireSupervisorPlus, async (req, res) => {
    try {
      const { itemId, photoDate } = req.params;
      const updated = await storage.verifyItemCount(itemId, photoDate);
      if (!updated) return res.status(404).json({ error: "Count entry not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error verifying count:", error);
      res.status(500).json({ error: "Failed to verify count" });
    }
  });

  // ─── Analysis Routes ───────────────────────────────────────────────────────

  // Lightweight summary endpoint (excludes large base64 images to prevent memory issues)
  app.get("/api/analysis/summary", requireProgrammerPlus, async (req, res) => {
    try {
      const itemId = req.query.itemId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const results = await storage.getAnalysisResultsSummary(itemId, limit);
      res.json(results);
    } catch (error) {
      console.error("Error fetching analysis summary:", error);
      res.status(500).json({ error: "Failed to fetch analysis summary" });
    }
  });

  // Full analysis results (includes images - use sparingly)
  app.get("/api/analysis", requireProgrammerPlus, async (req, res) => {
    try {
      const itemId = req.query.itemId as string | undefined;
      const results = await storage.getAnalysisResults(itemId);
      res.json(results);
    } catch (error) {
      console.error("Error fetching analysis results:", error);
      res.status(500).json({ error: "Failed to fetch analysis results" });
    }
  });

  app.delete("/api/analysis/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAnalysisResult(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Analysis result not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting analysis result:", error);
      res.status(500).json({ error: "Failed to delete analysis result" });
    }
  });

  app.get("/api/analysis/:id", async (req, res) => {
    try {
      const result = await storage.getAnalysisResultById(req.params.id);
      if (!result) {
        return res.status(404).json({ error: "Analysis result not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching analysis result:", error);
      res.status(500).json({ error: "Failed to fetch analysis result" });
    }
  });

  app.post("/api/analyze", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Validate that it's an actual image file
      const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!validMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ 
          error: `Invalid file type: ${req.file.mimetype}. Please upload a valid image (JPEG, PNG, WebP, or GIF).` 
        });
      }

      // Validate file size (max 10MB is already handled by multer, but let's check for minimum too)
      if (req.file.size < 100) {
        return res.status(400).json({ error: "Image file is too small or corrupted. Please upload a valid image." });
      }

      const imageBase64 = req.file.buffer.toString("base64");
      const mimeType = req.file.mimetype;
      const fullImageDataUrl = `data:${mimeType};base64,${imageBase64}`;
      const itemsToDetect = req.body.itemsToDetect ? JSON.parse(req.body.itemsToDetect) : undefined;
      const promptId = req.body.promptId;
      const modelId = req.body.modelId;
      const skipCache = req.body.skipCache === 'true';
      const photoDate = req.body.photoDate;

      // Get custom prompt if provided, or use default prompt from storage
      let customPrompt: string | undefined;
      if (promptId) {
        const prompt = await storage.getPrompt(promptId);
        if (prompt) {
          customPrompt = prompt.content;
        }
      } else {
        // No promptId provided, try to get the default prompt from storage
        const defaultPrompt = await storage.getDefaultPrompt();
        if (defaultPrompt) {
          customPrompt = defaultPrompt.content;
        }
        // If no default prompt exists, customPrompt remains undefined and will fall back to BASE_PROMPT
      }

      // Get model from settings if not provided
      let selectedModel = modelId;
      if (!selectedModel) {
        const modelSetting = await storage.getSetting('defaultModel');
        selectedModel = modelSetting?.value || 'gpt-4o';
      }

      // Compute hash of the image to detect duplicates
      const imageHash = createHash('sha256').update(req.file.buffer).digest('hex');

      // Check if this image has been analyzed before (only if caching is enabled)
      const existingAnalysis = skipCache ? [] : await storage.getAnalysisResultByImageHash(imageHash);
      
      if (existingAnalysis.length > 0) {
        // Return cached results without creating new inventory entries or updating counts
        const inventoryItems = await storage.getInventoryItems();
        const detectedItems = existingAnalysis.map(result => {
          const item = inventoryItems.find(i => i.id === result.itemId);
          const annotations = result.annotations ? JSON.parse(result.annotations) : {};
          return {
            itemType: item?.name || 'Unknown',
            count: result.detectedCount,
            confidence: result.confidence,
            location: annotations.location || 'Unknown'
          };
        });

        const firstResult = existingAnalysis[0];
        const annotations = firstResult.annotations ? JSON.parse(firstResult.annotations) : {};
        
        return res.json({
          success: true,
          cached: true,
          analysisResult: {
            detectedItems,
            imageDescription: annotations.description || 'Previously analyzed warehouse image',
            totalItems: detectedItems.reduce((sum, item) => sum + item.count, 0)
          },
          savedResults: existingAnalysis,
          createdItems: 0,
          newItems: [],
          uploadedImageUrl: fullImageDataUrl,
          message: 'This image was previously analyzed. Showing cached results to prevent double-counting.'
        });
      }

      // Image not seen before - proceed with analysis
      // Get existing inventory items to use their user inputs as context
      const inventoryItems = await storage.getInventoryItems();
      const userInstructions: UserInstruction[] = inventoryItems
        .filter(item => item.userInput && item.userInput.trim())
        .map(item => ({
          itemName: item.name,
          instructions: item.userInput!
        }));
      
      // Get active training examples for few-shot learning
      const trainingExamples = await storage.getTrainingExamples(true);
      let finalPrompt = customPrompt; // Start with custom prompt (could be undefined)
      
      if (trainingExamples.length > 0) {
        let examplesText = '\n\n## TRAINING EXAMPLES (Learn from these accurate counts and methodologies):\n';
        examplesText += 'The following examples show how items should be identified and counted in warehouse images:\n\n';
        
        trainingExamples.forEach((example, idx) => {
          try {
            const items = JSON.parse(example.detectedItems);
            examplesText += `### Example ${idx + 1}: ${example.title}\n`;
            if (example.description) {
              examplesText += `Scene: ${example.description}\n`;
            }
            examplesText += 'Items detected:\n';
            items.forEach((item: { itemType: string; count: number; countingMethod: string }) => {
              examplesText += `- ${item.itemType}: ${item.count} items\n`;
              examplesText += `  Counting method: ${item.countingMethod}\n`;
            });
            examplesText += '\n';
          } catch (e) {
            console.error('Error parsing training example:', e);
          }
        });
        
        examplesText += 'Use these examples as a guide for accurate counting methodology. Apply similar counting techniques to the new image.\n';
        
        // If we have a custom prompt, append examples to it
        // If not, the examples will be appended to the base prompt by the model service
        if (finalPrompt) {
          finalPrompt = finalPrompt + examplesText;
        } else {
          // Pass examples as a special marker that model services can append to their base prompts
          finalPrompt = examplesText;
        }
      }
      
      let analysisResult;
      try {
        analysisResult = await modelService.analyzeImage(
          fullImageDataUrl,
          selectedModel,
          finalPrompt,
          userInstructions,
          mimeType
        );
      } catch (aiError: any) {
        console.error("OpenAI analysis error:", aiError);
        
        // Provide more specific error messages based on the error type
        if (aiError.message?.includes('Invalid image')) {
          return res.status(400).json({ 
            error: "The uploaded image could not be processed. Please ensure it's a valid, non-corrupted image file." 
          });
        }
        if (aiError.status === 400) {
          return res.status(400).json({ 
            error: "The AI service rejected the image. Please try a different image or contact support if the issue persists." 
          });
        }
        if (aiError.status === 429) {
          return res.status(429).json({ 
            error: "Too many requests. Please wait a moment and try again." 
          });
        }
        
        // Generic AI error
        return res.status(500).json({ 
          error: "AI analysis service is currently unavailable. Please try again later." 
        });
      }

      // Get configurable confidence threshold from settings (default 80%)
      const confidenceSetting = await storage.getSetting('confidenceThreshold');
      const CONFIDENCE_THRESHOLD = confidenceSetting?.value ? parseInt(confidenceSetting.value, 10) : 80;
      const results = [];
      const createdItems = [];
      const skippedItems = [];

      // Helper function to clean item names by removing packaging details
      // Keeps the AI's original description but removes counts, sizes, packaging info
      const cleanItemName = (name: string): string => {
        let cleaned = name
          // Remove parenthetical content like "(28 count)", "(variety pack)", "(36-bag)"
          .replace(/\([^)]*\)/g, '')
          // Remove bracketed content like "[bulk]"
          .replace(/\[[^\]]*\]/g, '')
          // Remove patterns like "36-bag", "28-count", "12-pack"
          .replace(/\b\d+[-\s]?(bag|bags|count|ct|pack|packs|case|cases|box|boxes|can|cans|bottle|bottles|oz|lb|kg|ml|liter|liters|piece|pieces|serving|servings)\b/gi, '')
          // Remove standalone packaging words at end: "variety pack", "assorted flavors", "bulk", "multipack"
          .replace(/\b(variety\s+pack|assorted\s+flavors?|bulk\s+pack|multipack|multi[-\s]?pack|snack\s+packs?|per\s+case|bags?\s+per\s+case|whole\s+grain\s+cases?)\b/gi, '')
          // Remove trailing packaging words
          .replace(/\s+(cases?|packs?|boxes?|bags?|bulk)$/gi, '')
          // Clean up extra whitespace
          .replace(/\s+/g, ' ')
          .trim();
        
        // Capitalize first letter of each word for consistency
        cleaned = cleaned.split(' ')
          .filter(w => w.length > 0)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        
        return cleaned || name; // Fallback to original if cleaning removes everything
      };

      // Helper function to normalize item names for matching (lowercase, no punctuation)
      const normalizeForMatching = (name: string): string => {
        return cleanItemName(name)
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      };

      // Helper function to get words from a cleaned name
      const getWords = (name: string): string[] => {
        return normalizeForMatching(name).split(' ').filter(w => w.length > 1);
      };

      // Helper function to calculate similarity score between two item names
      const calculateSimilarity = (name1: string, name2: string): number => {
        const cleaned1 = normalizeForMatching(name1);
        const cleaned2 = normalizeForMatching(name2);
        
        // Exact match after cleaning
        if (cleaned1 === cleaned2) return 1.0;
        
        // Check if one contains the other
        if (cleaned1.includes(cleaned2) || cleaned2.includes(cleaned1)) return 0.95;
        
        // Word-based matching
        const words1 = getWords(name1);
        const words2 = getWords(name2);
        
        if (words1.length === 0 || words2.length === 0) return 0;
        
        // Count matching words (including partial matches for plurals)
        let matchCount = 0;
        for (const w1 of words1) {
          for (const w2 of words2) {
            // Check if words match (accounting for plurals)
            const base1 = w1.replace(/s$/, '').replace(/es$/, '').replace(/ies$/, 'y');
            const base2 = w2.replace(/s$/, '').replace(/es$/, '').replace(/ies$/, 'y');
            if (base1 === base2 || w1.startsWith(w2) || w2.startsWith(w1)) {
              matchCount++;
              break;
            }
          }
        }
        
        // Calculate similarity based on how many core words match
        const minWords = Math.min(words1.length, words2.length);
        return matchCount / minWords;
      };

      // Helper function to find best matching inventory item
      const findBestMatch = (detectedName: string, items: typeof inventoryItems): typeof inventoryItems[0] | null => {
        const SIMILARITY_THRESHOLD = 0.75;
        let bestMatch: typeof items[0] | null = null;
        let bestScore = 0;
        
        const cleanedName = cleanItemName(detectedName);
        console.log(`Detected item: "${detectedName}" -> cleaned: "${cleanedName}"`);
        
        for (const item of items) {
          const score = calculateSimilarity(detectedName, item.name);
          console.log(`  vs "${item.name}" = ${score.toFixed(2)}`);
          if (score > bestScore && score >= SIMILARITY_THRESHOLD) {
            bestScore = score;
            bestMatch = item;
          }
        }
        
        if (bestMatch) {
          console.log(`Best match for "${detectedName}": "${bestMatch.name}" (score: ${bestScore.toFixed(2)})`);
        } else {
          console.log(`No match found for "${detectedName}" - will create new item with name: "${cleanedName}"`);
        }
        
        return bestMatch;
      };
      
      const isTestingMode = req.session?.role === "programmer" && req.session?.testingMode === true;

      for (const detectedItem of analysisResult.detectedItems) {
        // Skip low-confidence detections entirely, regardless of whether item exists
        if (detectedItem.confidence < CONFIDENCE_THRESHOLD) {
          skippedItems.push({
            itemType: detectedItem.itemType,
            count: detectedItem.count,
            confidence: detectedItem.confidence,
            reason: `Confidence ${detectedItem.confidence}% is below threshold of ${CONFIDENCE_THRESHOLD}%`
          });
          continue; // Skip this detection completely
        }

        const inventoryItems = await storage.getInventoryItems();
        let matchingItem = findBestMatch(detectedItem.itemType, inventoryItems);

        if (!isTestingMode) {
          // If no matching item exists, create a new inventory item with cleaned name
          if (!matchingItem) {
            // Use cleaned name (AI's original with packaging details removed)
            const cleanedName = cleanItemName(detectedItem.itemType);
            const newItem = await storage.createInventoryItem({
              name: cleanedName,
              sku: `AUTO-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
              category: 'Auto-detected',
              location: detectedItem.location || 'Unknown',
              currentCount: detectedItem.count,
              minThreshold: 10,
              imageUrl: fullImageDataUrl,
            });
            matchingItem = newItem;
            createdItems.push(newItem);
          } else if (!matchingItem.imageUrl) {
            // Update existing item with image if it doesn't have one
            await storage.updateInventoryItem(matchingItem.id, {
              imageUrl: fullImageDataUrl,
            });
            matchingItem.imageUrl = fullImageDataUrl;
          }
        }

        // In testing mode use a dummy item id if no match; otherwise use the matched item
        const itemId = matchingItem?.id ?? `test-${Date.now()}`;

        // Create analysis result for this high-confidence detection
        const result = await storage.createAnalysisResult({
          itemId,
          imageUrl: fullImageDataUrl,
          imageHash,
          detectedCount: detectedItem.count,
          confidence: detectedItem.confidence,
          modelType: analysisResult.modelType,
          modelName: analysisResult.modelName,
          isTest: isTestingMode ? 1 : 0,
          annotations: JSON.stringify({
            location: detectedItem.location,
            description: analysisResult.imageDescription,
            countingMethod: detectedItem.countingMethod || null
          })
        });
        results.push(result);

        // Save count to inventory_item_counts if photoDate is provided and NOT in testing mode
        if (photoDate && !isTestingMode && matchingItem) {
          await storage.upsertItemCount({
            itemId: matchingItem.id,
            photoDate: photoDate,
            absoluteCount: detectedItem.count,
            sourceAnalysisId: result.id
          });
        }
      }

      if (isTestingMode) {
        return res.json({
          success: true,
          testMode: true,
          cached: false,
          analysisResult,
          savedResults: results,
          createdItems: 0,
          newItems: [],
          skippedItems: skippedItems.length > 0 ? skippedItems : undefined,
          uploadedImageUrl: fullImageDataUrl,
          message: "Testing mode active — results not saved to inventory."
        });
      }

      res.json({
        success: true,
        cached: false,
        analysisResult,
        savedResults: results,
        createdItems: createdItems.length,
        newItems: createdItems,
        skippedItems: skippedItems.length > 0 ? skippedItems : undefined,
        uploadedImageUrl: fullImageDataUrl
      });
    } catch (error) {
      console.error("Error analyzing image:", error);
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

  // ─── Alerts Routes ────────────────────────────────────────────────────────

  app.get("/api/alerts", requireSupervisorPlus, async (req, res) => {
    try {
      const dismissed = req.query.dismissed === 'true' ? true : 
                       req.query.dismissed === 'false' ? false : 
                       undefined;
      const alerts = await storage.getAlerts(dismissed);
      
      const alertsWithItems = await Promise.all(
        alerts.map(async (alert) => {
          const item = await storage.getInventoryItem(alert.itemId);
          return {
            ...alert,
            itemName: item?.name || 'Unknown Item',
            currentCount: item?.currentCount || 0,
            threshold: item?.minThreshold || 0
          };
        })
      );
      
      res.json(alertsWithItems);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts/:id/dismiss", requireSupervisorPlus, async (req, res) => {
    try {
      const dismissed = await storage.dismissAlert(req.params.id);
      if (!dismissed) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error dismissing alert:", error);
      res.status(500).json({ error: "Failed to dismiss alert" });
    }
  });

  app.post("/api/alerts/dismiss-all", requireSupervisorPlus, async (req, res) => {
    try {
      const count = await storage.dismissAllAlerts();
      res.json({ success: true, count });
    } catch (error) {
      console.error("Error dismissing all alerts:", error);
      res.status(500).json({ error: "Failed to dismiss alerts" });
    }
  });

  // ─── Prompt Routes ────────────────────────────────────────────────────────

  app.get("/api/prompts", requireProgrammerPlus, async (req, res) => {
    try {
      const prompts = await storage.getPrompts();
      res.json(prompts);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      res.status(500).json({ error: "Failed to fetch prompts" });
    }
  });

  app.get("/api/prompts/default", async (req, res) => {
    try {
      const prompt = await storage.getDefaultPrompt();
      if (!prompt) {
        return res.status(404).json({ error: "No default prompt found" });
      }
      res.json(prompt);
    } catch (error) {
      console.error("Error fetching default prompt:", error);
      res.status(500).json({ error: "Failed to fetch default prompt" });
    }
  });

  app.get("/api/prompts/:id", requireProgrammerPlus, async (req, res) => {
    try {
      const prompt = await storage.getPrompt(req.params.id);
      if (!prompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }
      res.json(prompt);
    } catch (error) {
      console.error("Error fetching prompt:", error);
      res.status(500).json({ error: "Failed to fetch prompt" });
    }
  });

  app.post("/api/prompts", requireProgrammerPlus, async (req, res) => {
    try {
      const validatedData = insertPromptSchema.parse(req.body);
      const prompt = await storage.createPrompt(validatedData);
      res.json(prompt);
    } catch (error) {
      console.error("Error creating prompt:", error);
      res.status(400).json({ error: "Invalid prompt data" });
    }
  });

  app.patch("/api/prompts/:id", requireProgrammerPlus, async (req, res) => {
    try {
      const prompt = await storage.updatePrompt(req.params.id, req.body);
      if (!prompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }
      res.json(prompt);
    } catch (error) {
      console.error("Error updating prompt:", error);
      res.status(500).json({ error: "Failed to update prompt" });
    }
  });

  app.delete("/api/prompts/:id", requireProgrammerPlus, async (req, res) => {
    try {
      const deleted = await storage.deletePrompt(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Prompt not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting prompt:", error);
      res.status(500).json({ error: "Failed to delete prompt" });
    }
  });

  app.post("/api/prompts/:id/set-default", requireProgrammerPlus, async (req, res) => {
    try {
      const success = await storage.setDefaultPrompt(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Prompt not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting default prompt:", error);
      res.status(500).json({ error: "Failed to set default prompt" });
    }
  });

  // ─── Settings Routes ──────────────────────────────────────────────────────

  app.get("/api/settings", requireProgrammerPlus, async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      
      // Filter out sensitive settings (API keys) - never expose secrets to client
      const secretKeys = ['roboflow_api_key', 'openai_api_key'];
      const safeSettings = settings
        .filter(s => !secretKeys.includes(s.key))
        .reduce((acc, s) => {
          acc[s.key] = s.value;
          return acc;
        }, {} as Record<string, string>);
      
      res.json(safeSettings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.get("/api/settings/:key", requireProgrammerPlus, async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json({ key: setting.key, value: setting.value });
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ error: "Failed to fetch setting" });
    }
  });

  app.post("/api/settings", requireProgrammerPlus, async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key || value === undefined) {
        return res.status(400).json({ error: "Key and value are required" });
      }
      
      // Validate that we're not trying to set system-only settings via API
      const systemOnlyKeys = ['internal_config'];
      if (systemOnlyKeys.includes(key)) {
        return res.status(403).json({ error: "Cannot modify system settings via API" });
      }
      
      const setting = await storage.setSetting(key, value);
      
      // Don't return the value for secret keys
      const secretKeys = ['roboflow_api_key', 'openai_api_key'];
      if (secretKeys.includes(key)) {
        res.json({ key: setting.key, value: '••••••••', updatedAt: setting.updatedAt });
      } else {
        res.json(setting);
      }
    } catch (error) {
      console.error("Error saving setting:", error);
      res.status(500).json({ error: "Failed to save setting" });
    }
  });

  // ─── Models Route ─────────────────────────────────────────────────────────

  app.get("/api/models", async (req, res) => {
    try {
      res.json(AVAILABLE_MODELS);
    } catch (error) {
      console.error("Error fetching models:", error);
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  // ─── Stats Route ──────────────────────────────────────────────────────────

  app.get("/api/stats", requireSupervisorPlus, async (req, res) => {
    try {
      const items = await storage.getInventoryItems();
      const alerts = await storage.getAlerts(false);
      const analysisResults = await storage.getAnalysisResults();

      const totalItems = items.reduce((sum, item) => sum + item.currentCount, 0);
      const lowStockItems = items.filter(item => item.currentCount < item.minThreshold).length;
      const outOfStockItems = items.filter(item => item.currentCount === 0).length;

      res.json({
        totalItems,
        totalItemTypes: items.length,
        lowStockItems,
        outOfStockItems,
        activeAlerts: alerts.length,
        totalScans: analysisResults.length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ─── Training Examples Routes ─────────────────────────────────────────────

  app.get("/api/training-examples", requireProgrammerPlus, async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const examples = await storage.getTrainingExamples(activeOnly);
      res.json(examples);
    } catch (error) {
      console.error("Error fetching training examples:", error);
      res.status(500).json({ error: "Failed to fetch training examples" });
    }
  });

  app.get("/api/training-examples/:id", requireProgrammerPlus, async (req, res) => {
    try {
      const example = await storage.getTrainingExample(req.params.id);
      if (!example) {
        return res.status(404).json({ error: "Training example not found" });
      }
      res.json(example);
    } catch (error) {
      console.error("Error fetching training example:", error);
      res.status(500).json({ error: "Failed to fetch training example" });
    }
  });

  app.post("/api/training-examples", requireProgrammerPlus, upload.single("image"), async (req, res) => {
    try {
      let imageUrl: string;
      
      if (req.file) {
        const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!validMimeTypes.includes(req.file.mimetype)) {
          return res.status(400).json({ 
            error: `Invalid file type: ${req.file.mimetype}. Please upload a valid image (JPEG, PNG, WebP, or GIF).` 
          });
        }
        const imageBase64 = req.file.buffer.toString("base64");
        imageUrl = `data:${req.file.mimetype};base64,${imageBase64}`;
      } else if (req.body.imageUrl) {
        imageUrl = req.body.imageUrl;
      } else {
        return res.status(400).json({ error: "No image provided" });
      }

      // Parse and validate detectedItems
      let parsedItems;
      try {
        parsedItems = typeof req.body.detectedItems === 'string' 
          ? JSON.parse(req.body.detectedItems) 
          : req.body.detectedItems;
        if (!Array.isArray(parsedItems)) {
          return res.status(400).json({ error: "detectedItems must be an array" });
        }
        // Validate each item has required fields with correct types
        for (let i = 0; i < parsedItems.length; i++) {
          const item = parsedItems[i];
          if (typeof item.itemType !== 'string' || item.itemType.trim() === '') {
            return res.status(400).json({ error: `Item ${i + 1}: itemType must be a non-empty string` });
          }
          if (typeof item.count !== 'number' || !Number.isFinite(item.count) || item.count < 0) {
            return res.status(400).json({ error: `Item ${i + 1}: count must be a non-negative number` });
          }
          if (typeof item.countingMethod !== 'string' || item.countingMethod.trim() === '') {
            return res.status(400).json({ error: `Item ${i + 1}: countingMethod must be a non-empty string` });
          }
        }
      } catch {
        return res.status(400).json({ error: "Invalid JSON format for detectedItems" });
      }

      const exampleData = {
        title: req.body.title,
        description: req.body.description || null,
        imageUrl,
        detectedItems: JSON.stringify(parsedItems),
        isActive: req.body.isActive === 'false' ? 0 : 1
      };

      const validatedData = insertTrainingExampleSchema.parse(exampleData);
      const example = await storage.createTrainingExample(validatedData);
      res.json(example);
    } catch (error) {
      console.error("Error creating training example:", error);
      res.status(400).json({ error: "Invalid training example data" });
    }
  });

  app.patch("/api/training-examples/:id", requireProgrammerPlus, async (req, res) => {
    try {
      const updateData: Partial<{ title: string; description: string | null; detectedItems: string; isActive: number }> = {};
      
      if (req.body.title !== undefined) {
        if (typeof req.body.title !== 'string' || req.body.title.trim() === '') {
          return res.status(400).json({ error: "Title must be a non-empty string" });
        }
        updateData.title = req.body.title;
      }
      
      if (req.body.description !== undefined) {
        updateData.description = req.body.description;
      }
      
      if (req.body.detectedItems !== undefined) {
        try {
          const items = typeof req.body.detectedItems === 'string' 
            ? JSON.parse(req.body.detectedItems) 
            : req.body.detectedItems;
          if (!Array.isArray(items)) {
            return res.status(400).json({ error: "detectedItems must be an array" });
          }
          // Validate each item has required fields with correct types
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (typeof item.itemType !== 'string' || item.itemType.trim() === '') {
              return res.status(400).json({ error: `Item ${i + 1}: itemType must be a non-empty string` });
            }
            if (typeof item.count !== 'number' || !Number.isFinite(item.count) || item.count < 0) {
              return res.status(400).json({ error: `Item ${i + 1}: count must be a non-negative number` });
            }
            if (typeof item.countingMethod !== 'string' || item.countingMethod.trim() === '') {
              return res.status(400).json({ error: `Item ${i + 1}: countingMethod must be a non-empty string` });
            }
          }
          updateData.detectedItems = JSON.stringify(items);
        } catch {
          return res.status(400).json({ error: "Invalid JSON format for detectedItems" });
        }
      }
      
      if (req.body.isActive !== undefined) {
        updateData.isActive = req.body.isActive === 1 || req.body.isActive === true ? 1 : 0;
      }
      
      const example = await storage.updateTrainingExample(req.params.id, updateData);
      if (!example) {
        return res.status(404).json({ error: "Training example not found" });
      }
      res.json(example);
    } catch (error) {
      console.error("Error updating training example:", error);
      res.status(500).json({ error: "Failed to update training example" });
    }
  });

  app.delete("/api/training-examples/:id", requireProgrammerPlus, async (req, res) => {
    try {
      const deleted = await storage.deleteTrainingExample(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Training example not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting training example:", error);
      res.status(500).json({ error: "Failed to delete training example" });
    }
  });

  // ─── Evaluate Route (Programmer only — never saves to inventory) ───────────

  app.post("/api/evaluate", requireProgrammerPlus, upload.single("image"), async (req, res) => {
    try {
      let imageDataUrl: string;
      let mimeType: string = "image/jpeg";

      if (req.file) {
        const validMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
        if (!validMimeTypes.includes(req.file.mimetype)) {
          return res.status(400).json({ error: "Invalid file type" });
        }
        mimeType = req.file.mimetype;
        imageDataUrl = `data:${mimeType};base64,${req.file.buffer.toString("base64")}`;
      } else if (req.body.analysisId) {
        const existing = await storage.getAnalysisResultById(req.body.analysisId);
        if (!existing) return res.status(404).json({ error: "Analysis result not found" });
        imageDataUrl = existing.imageUrl;
      } else {
        return res.status(400).json({ error: "Provide an image file or analysisId" });
      }

      const promptId = req.body.promptId;
      const modelId = req.body.modelId;
      let customPrompt: string | undefined;
      if (promptId) {
        const prompt = await storage.getPrompt(promptId);
        if (prompt) customPrompt = prompt.content;
      } else {
        const defaultPrompt = await storage.getDefaultPrompt();
        if (defaultPrompt) customPrompt = defaultPrompt.content;
      }

      let selectedModel = modelId;
      if (!selectedModel) {
        const modelSetting = await storage.getSetting("defaultModel");
        selectedModel = modelSetting?.value || "gpt-4o";
      }

      const analysisResult = await modelService.analyzeImage(
        imageDataUrl, selectedModel, customPrompt, [], mimeType
      );

      const imageHash = createHash("sha256").update(
        req.file ? req.file.buffer : Buffer.from(imageDataUrl)
      ).digest("hex");

      // Save with isTest=1, using a placeholder itemId
      const placeholderItemId = `eval-${Date.now()}`;
      const saved = await storage.createAnalysisResult({
        itemId: placeholderItemId,
        imageUrl: imageDataUrl,
        imageHash,
        detectedCount: analysisResult.totalItems,
        confidence: analysisResult.detectedItems[0]?.confidence ?? 0,
        modelType: analysisResult.modelType,
        modelName: analysisResult.modelName,
        isTest: 1,
        annotations: JSON.stringify({ description: analysisResult.imageDescription }),
      });

      res.json({
        success: true,
        analysisResult,
        analysisResultId: saved.id,
        uploadedImageUrl: imageDataUrl,
      });
    } catch (error) {
      console.error("Error in evaluate:", error);
      res.status(500).json({ error: "Evaluation failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
