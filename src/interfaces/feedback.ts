import { CodePrediction, UserFeedback, PredictionFeedback } from './prediction';

/**
 * Interfaces for feedback learning system
 */

export interface FeedbackLearningSystem {
  processFeedback(feedback: PredictionFeedback): Promise<void>;
  updateModels(feedbackBatch: PredictionFeedback[]): Promise<void>;
  getModelPerformance(): ModelPerformanceMetrics;
  rollbackModel(version: string): Promise<void>;
}

export interface ModelPerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  userSatisfaction: number;
  responseTime: number;
}

export interface ModelVersion {
  id: string;
  version: string;
  timestamp: Date;
  performance: ModelPerformanceMetrics;
  metadata: Record<string, any>;
}

export interface LearningConfiguration {
  learningRate: number;
  batchSize: number;
  updateFrequency: number;
  explorationRate: number;
  privacyBudget: number;
}