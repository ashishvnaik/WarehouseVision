import fetch from 'node-fetch';
import type { AnalysisResponse, DetectionResult } from './config';
import { storage } from '../storage';

interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id: number;
}

interface RoboflowResponse {
  predictions: RoboflowPrediction[];
  image: {
    width: number;
    height: number;
  };
}

export class RoboflowService {
  private projectId: string;
  private modelVersion: string;

  constructor() {
    this.projectId = process.env.ROBOFLOW_PROJECT_ID || 'warehouse-inventory';
    this.modelVersion = process.env.ROBOFLOW_MODEL_VERSION || '1';
  }

  async analyzeImage(
    base64Image: string,
    modelName: string,
    userInstructions?: string[]
  ): Promise<AnalysisResponse> {
    // Get API key from settings (server-side only)
    const apiKeySetting = await storage.getSetting('roboflow_api_key');
    const apiKey = apiKeySetting?.value || process.env.ROBOFLOW_API_KEY;
    
    if (!apiKey) {
      throw new Error('ROBOFLOW_API_KEY is not configured. Please add it in Settings or set the ROBOFLOW_API_KEY environment variable.');
    }

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    const url = `https://detect.roboflow.com/${this.projectId}/${this.modelVersion}?api_key=${apiKey}&confidence=40`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `image=${encodeURIComponent(base64Data)}`,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Roboflow API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as RoboflowResponse;

      const itemCounts = new Map<string, {
        count: number;
        totalConfidence: number;
        locations: string[];
        boundingBoxes: Array<{ x: number; y: number; width: number; height: number }>;
      }>();

      data.predictions.forEach(pred => {
        const className = pred.class;
        const existing = itemCounts.get(className) || {
          count: 0,
          totalConfidence: 0,
          locations: [],
          boundingBoxes: []
        };

        existing.count++;
        existing.totalConfidence += pred.confidence;
        existing.boundingBoxes.push({
          x: pred.x,
          y: pred.y,
          width: pred.width,
          height: pred.height
        });

        const location = this.getLocationDescription(pred, data.image.width, data.image.height);
        if (location && !existing.locations.includes(location)) {
          existing.locations.push(location);
        }

        itemCounts.set(className, existing);
      });

      const detectedItems: DetectionResult[] = Array.from(itemCounts.entries()).map(([itemType, data]) => {
        const avgConfidence = Math.round((data.totalConfidence / data.count) * 100);
        
        return {
          itemType,
          count: data.count,
          confidence: avgConfidence,
          location: data.locations.length > 0 ? data.locations.join(', ') : null,
          boundingBox: data.boundingBoxes[0]
        };
      });

      const totalItems = detectedItems.reduce((sum, item) => sum + item.count, 0);
      const imageDescription = this.generateImageDescription(detectedItems, totalItems);

      return {
        detectedItems,
        totalItems,
        imageDescription,
        modelType: 'cnn',
        modelName
      };
    } catch (error) {
      console.error('Roboflow analysis error:', error);
      throw new Error(`Failed to analyze image with Roboflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getLocationDescription(
    pred: RoboflowPrediction,
    imageWidth: number,
    imageHeight: number
  ): string | null {
    const centerX = pred.x;
    const centerY = pred.y;

    const horizontal = centerX < imageWidth / 3 ? 'left' 
      : centerX > (2 * imageWidth) / 3 ? 'right' 
      : 'center';

    const vertical = centerY < imageHeight / 3 ? 'top'
      : centerY > (2 * imageHeight) / 3 ? 'bottom'
      : 'middle';

    if (horizontal === 'center' && vertical === 'middle') {
      return 'center';
    }

    return `${vertical} ${horizontal}`;
  }

  private generateImageDescription(items: DetectionResult[], total: number): string {
    if (items.length === 0) {
      return 'No objects detected in the warehouse image.';
    }

    const itemDescriptions = items.map(item => 
      `${item.count} ${item.itemType}${item.count > 1 ? 's' : ''}`
    ).join(', ');

    return `Warehouse image containing ${total} total items: ${itemDescriptions}`;
  }
}

export const roboflowService = new RoboflowService();
