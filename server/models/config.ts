export type ModelType = 'llm' | 'cnn';

export interface ModelConfig {
  id: string;
  name: string;
  type: ModelType;
  provider: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2 Vision (OpenAI)',
    type: 'llm',
    provider: 'openai',
    description: 'OpenAI GPT-5.2 with advanced vision capabilities for inventory detection',
    requiresApiKey: true,
    apiKeyEnvVar: 'AI_INTEGRATIONS_OPENAI_API_KEY'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4 Vision (OpenAI)',
    type: 'llm',
    provider: 'openai',
    description: 'OpenAI GPT-4 with vision capabilities for detailed object detection and counting',
    requiresApiKey: true,
    apiKeyEnvVar: 'AI_INTEGRATIONS_OPENAI_API_KEY'
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4 (Anthropic)',
    type: 'llm',
    provider: 'anthropic',
    description: 'Anthropic Claude with vision capabilities - latest model, balanced performance',
    requiresApiKey: true,
    apiKeyEnvVar: 'ANTHROPIC_API_KEY'
  },
  {
    id: 'claude-opus-4-5',
    name: 'Claude Opus 4.5 (Anthropic)',
    type: 'llm',
    provider: 'anthropic',
    description: 'Anthropic Claude Opus - most capable model for complex reasoning',
    requiresApiKey: true,
    apiKeyEnvVar: 'ANTHROPIC_API_KEY'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (Google)',
    type: 'llm',
    provider: 'gemini',
    description: 'Google Gemini with vision - fast hybrid model for daily use',
    requiresApiKey: false,
    apiKeyEnvVar: 'AI_INTEGRATIONS_GEMINI_API_KEY'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro (Google)',
    type: 'llm',
    provider: 'gemini',
    description: 'Google Gemini Pro - excels at coding and complex reasoning',
    requiresApiKey: false,
    apiKeyEnvVar: 'AI_INTEGRATIONS_GEMINI_API_KEY'
  },
  {
    id: 'llama-3.2-90b-vision',
    name: 'Llama 3.2 90B Vision (OpenRouter)',
    type: 'llm',
    provider: 'openrouter',
    description: 'Meta Llama 3.2 90B with vision capabilities via OpenRouter',
    requiresApiKey: false,
    apiKeyEnvVar: 'AI_INTEGRATIONS_OPENROUTER_API_KEY'
  },
  {
    id: 'llama-3.2-11b-vision',
    name: 'Llama 3.2 11B Vision (OpenRouter)',
    type: 'llm',
    provider: 'openrouter',
    description: 'Meta Llama 3.2 11B with vision - faster, smaller model via OpenRouter',
    requiresApiKey: false,
    apiKeyEnvVar: 'AI_INTEGRATIONS_OPENROUTER_API_KEY'
  },
  {
    id: 'yolov8',
    name: 'YOLOv8 (Roboflow)',
    type: 'cnn',
    provider: 'roboflow',
    description: 'Real-time object detection using YOLOv8 CNN model via Roboflow',
    requiresApiKey: true,
    apiKeyEnvVar: 'ROBOFLOW_API_KEY'
  },
  {
    id: 'yolov9',
    name: 'YOLOv9 (Roboflow)',
    type: 'cnn',
    provider: 'roboflow',
    description: 'Latest YOLO model with improved accuracy via Roboflow',
    requiresApiKey: true,
    apiKeyEnvVar: 'ROBOFLOW_API_KEY'
  }
];

export interface DetectionResult {
  itemType: string;
  count: number;
  confidence: number;
  location: string | null;
  countingMethod?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface AnalysisResponse {
  detectedItems: DetectionResult[];
  totalItems: number;
  imageDescription: string;
  modelType: ModelType;
  modelName: string;
}

export function getModelById(id: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find(m => m.id === id);
}

export function getModelsByType(type: ModelType): ModelConfig[] {
  return AVAILABLE_MODELS.filter(m => m.type === type);
}

export function getDefaultModel(): ModelConfig {
  return AVAILABLE_MODELS[0];
}
