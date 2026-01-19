import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export interface DetectedItem {
  itemType: string;
  count: number;
  confidence: number;
  location?: string;
}

export interface AnalysisResponse {
  detectedItems: DetectedItem[];
  totalItems: number;
  imageDescription: string;
}

export interface UserInstruction {
  itemName: string;
  instructions: string;
}

export async function analyzeWarehouseImage(
  imageBase64: string,
  mimeType?: string,
  itemsToDetect?: string[],
  userInstructions?: UserInstruction[],
  customPrompt?: string
): Promise<AnalysisResponse> {
  let userInstructionsText = '';
  if (userInstructions && userInstructions.length > 0) {
    userInstructionsText = '\n\nUSER-PROVIDED RECOGNITION INSTRUCTIONS:\n';
    userInstructions.forEach(({ itemName, instructions }) => {
      userInstructionsText += `\n- ${itemName}: ${instructions}`;
    });
    userInstructionsText += '\n\nPay special attention to these user-provided instructions when analyzing the image.';
  }

  // Use custom prompt if provided, otherwise use default
  const basePrompt = customPrompt || `You are a warehouse inventory analyst. Carefully examine this image and identify SPECIFIC products with maximum detail.

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

Be thorough, specific, and accurate. Read all visible text and branding.`;

  // Append user instructions to the prompt
  const prompt = basePrompt + userInstructionsText;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using gpt-4o for vision capabilities
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content) as AnalysisResponse;
    return result;
  } catch (error) {
    console.error("AI analysis error:", error);
    throw new Error("Failed to analyze image");
  }
}

export async function batchAnalyzeImages(
  imagesBase64: string[],
  mimeTypes?: string[],
  itemsToDetect?: string[],
  userInstructions?: UserInstruction[],
  customPrompt?: string
): Promise<AnalysisResponse[]> {
  const results = await Promise.all(
    imagesBase64.map((image, index) => 
      analyzeWarehouseImage(image, mimeTypes?.[index], itemsToDetect, userInstructions, customPrompt)
    )
  );
  return results;
}
