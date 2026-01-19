import { openaiService, type UserInstruction } from './openai-service';
import { roboflowService } from './roboflow-service';
import { geminiService } from './gemini-service';
import { anthropicService } from './anthropic-service';
import { openrouterService } from './openrouter-service';
import { getModelById, getDefaultModel, type AnalysisResponse } from './config';

export * from './config';
export type { UserInstruction };

export class ModelService {
  async analyzeImage(
    base64Image: string,
    modelId?: string,
    customPrompt?: string,
    userInstructions?: UserInstruction[],
    mimeType?: string
  ): Promise<AnalysisResponse> {
    const model = modelId ? getModelById(modelId) : getDefaultModel();
    
    if (!model) {
      throw new Error(`Model '${modelId}' not found`);
    }

    if (model.type === 'llm') {
      // Strip data URL prefix for all LLM services
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      
      if (model.provider === 'openai') {
        return await openaiService.analyzeImage(
          base64Data,
          model.id,
          customPrompt,
          userInstructions,
          mimeType
        );
      } else if (model.provider === 'gemini') {
        return await geminiService.analyzeImage(
          base64Data,
          model.id,
          customPrompt,
          userInstructions,
          mimeType
        );
      } else if (model.provider === 'anthropic') {
        return await anthropicService.analyzeImage(
          base64Data,
          model.id,
          customPrompt,
          userInstructions,
          mimeType
        );
      } else if (model.provider === 'openrouter') {
        return await openrouterService.analyzeImage(
          base64Data,
          model.id,
          customPrompt,
          userInstructions,
          mimeType
        );
      }
      throw new Error(`Unsupported LLM provider: ${model.provider}`);
    } else if (model.type === 'cnn') {
      if (model.provider === 'roboflow') {
        // Roboflow service expects the full data URL and strips it internally
        const instructions = userInstructions?.map(ui => ui.itemName) || [];
        return await roboflowService.analyzeImage(
          base64Image,
          model.id,
          instructions
        );
      }
      throw new Error(`Unsupported CNN provider: ${model.provider}`);
    }

    throw new Error(`Unsupported model type: ${model.type}`);
  }
}

export const modelService = new ModelService();
