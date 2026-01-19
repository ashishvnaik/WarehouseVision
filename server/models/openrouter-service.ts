import OpenAI from 'openai';
import type { AnalysisResponse } from './config';

const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
});

export interface UserInstruction {
  itemName: string;
  instructions: string;
}

const MODEL_ID_MAP: Record<string, string> = {
  'llama-3.2-90b-vision': 'meta-llama/llama-3.2-90b-vision-instruct',
  'llama-3.2-11b-vision': 'meta-llama/llama-3.2-11b-vision-instruct',
};

export class OpenRouterService {
  async analyzeImage(
    base64Image: string,
    modelId: string,
    customPrompt?: string,
    userInstructions?: UserInstruction[],
    mimeType?: string
  ): Promise<AnalysisResponse> {
    let userInstructionsText = '';
    if (userInstructions && userInstructions.length > 0) {
      userInstructionsText = '\n\nUSER-PROVIDED RECOGNITION INSTRUCTIONS:\n';
      userInstructions.forEach(({ itemName, instructions }) => {
        userInstructionsText += `\n- ${itemName}: ${instructions}`;
      });
      userInstructionsText += '\n\nPay special attention to these user-provided instructions when analyzing the image.';
    }

    const BASE_SYSTEM_PROMPT = `You are a warehouse inventory analyst. Carefully examine this image and identify SPECIFIC products with maximum detail.

IMPORTANT INSTRUCTIONS:
1. Identify the EXACT product name, brand, and type (e.g., "Smartwater 1L bottles", "Coca-Cola 12oz cans", "iPhone 15 Pro boxes")
2. DO NOT use generic terms like "boxes", "pallets", or "containers" - identify what's INSIDE or what the specific product is
3. Count items at multiple levels when applicable:
   - If there are boxes containing items, count BOTH the boxes AND estimate items per box
   - Example: "10 cases of Smartwater (24 bottles per case)" not just "boxes"
4. Include product details: brand names, sizes, packaging types, colors, variants
5. Be as specific as possible - read any visible text, labels, or logos

COUNTING METHOD:
For each item, explain briefly HOW you counted it (e.g., "Counted 3 rows of 4 bottles = 12 total", "Visible labels show 6 units").

For each distinct product type detected, provide:
- itemType: SPECIFIC product name with brand and details (e.g., "Smartwater 1-liter bottles in 24-pack cases")
- count: Total number of this product type (if boxes, count boxes; also mention items per box in itemType)
- confidence: Your confidence level (0-100)
- location: Where in the image/warehouse (if distinguishable)
- countingMethod: Brief explanation of how you counted (e.g., "3 rows x 4 columns = 12")

Return your response as a JSON object with this exact structure:
{
  "detectedItems": [
    {
      "itemType": "Specific product name with brand and packaging details",
      "count": number,
      "confidence": number,
      "location": "string or null",
      "countingMethod": "Brief explanation of counting methodology"
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
      "location": "center shelving unit",
      "countingMethod": "Counted 3 stacks of 4 cases each = 12 cases total"
    },
    {
      "itemType": "Red Bull Energy Drink 8.4oz cans",
      "count": 48,
      "confidence": 90,
      "location": "left pallet",
      "countingMethod": "4 rows x 12 cans per row = 48 cans"
    }
  ],
  "totalItems": 60,
  "imageDescription": "Warehouse showing 12 cases of Smartwater (approximately 288 bottles total) and 48 Red Bull cans on left pallet"
}

Be thorough, specific, and accurate. Read all visible text and branding.`;

    // Handle training examples: if customPrompt is just examples (starts with ##), append to base
    let basePrompt: string;
    if (!customPrompt) {
      basePrompt = BASE_SYSTEM_PROMPT;
    } else if (customPrompt.trim().startsWith('## TRAINING EXAMPLES')) {
      basePrompt = BASE_SYSTEM_PROMPT + customPrompt;
    } else {
      basePrompt = customPrompt;
    }

    const prompt = basePrompt + userInstructionsText + "\n\nRespond with valid JSON only, no other text.";

    const mediaType = mimeType || 'image/jpeg';
    const dataUrl = `data:${mediaType};base64,${base64Image}`;

    const openrouterModelId = MODEL_ID_MAP[modelId] || modelId;

    try {
      const response = await openrouter.chat.completions.create({
        model: openrouterModelId,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl
              }
            }
          ]
        }],
        max_tokens: 8192,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenRouter model");
      }

      let cleanedContent = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

      const result = JSON.parse(cleanedContent);
      
      return {
        detectedItems: result.detectedItems || [],
        totalItems: result.totalItems || 0,
        imageDescription: result.imageDescription || '',
        modelType: 'llm',
        modelName: modelId
      };
    } catch (error) {
      console.error("OpenRouter analysis error:", error);
      throw new Error(`Failed to analyze image with OpenRouter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const openrouterService = new OpenRouterService();
