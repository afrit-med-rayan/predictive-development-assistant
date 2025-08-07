import { PredictionType } from './common';
export { PredictionType } from './common';
import { BehavioralMetrics, BehavioralAction } from './behavioral';
import { CodeContext, ProjectContext } from './context';

/**
 * Interfaces for prediction engine and pattern recognition
 */

export interface PredictionEngine {
  generatePredictions(context: PredictionContext): Promise<CodePrediction[]>;
  rankPredictions(predictions: CodePrediction[]): RankedPrediction[];
  refineWithFeedback(prediction: CodePrediction, feedback: UserFeedback): void;
}

export interface PatternRecognitionEngine {
  trainBehavioralModel(data: BehavioralSequence[]): Promise<void>;
  predictNextActions(context: CombinedContext): Promise<ActionPrediction[]>;
  updateModel(feedback: PredictionFeedback): void;
  detectPatternChange(): boolean;
}

export interface CodePrediction {
  code: string;
  confidence: number;
  reasoning: string;
  type: PredictionType;
}

export interface RankedPrediction {
  prediction: CodePrediction;
  rank: number;
  combinedScore: number;
  behavioralScore: number;
  contextScore: number;
}

export interface PredictionContext {
  currentCode: string;
  cursorPosition: number;
  fileContext: CodeContext;
  projectContext: ProjectContext;
  behavioralState: BehavioralMetrics;
  recentActions: BehavioralAction[];
}

export interface CombinedContext {
  behavioral: BehavioralMetrics;
  code: CodeContext;
  project: ProjectContext;
  temporal: TemporalContext;
}

export interface TemporalContext {
  timeOfDay: number;
  sessionDuration: number;
  recentPatterns: string[];
}

export interface ActionPrediction {
  action: string;
  confidence: number;
  context: string;
}

export interface BehavioralSequence {
  userId: string;
  actions: BehavioralAction[];
  outcome: string;
  timestamp: Date;
}

export interface UserFeedback {
  predictionId: string;
  accepted: boolean;
  rating?: number;
  comments?: string;
  timestamp: Date;
}

export interface PredictionFeedback {
  prediction: CodePrediction;
  feedback: UserFeedback;
  context: PredictionContext;
}