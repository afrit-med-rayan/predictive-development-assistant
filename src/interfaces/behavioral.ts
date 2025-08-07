import { ActionType } from './common';
export { ActionType } from './common';

/**
 * Interfaces for behavioral data capture and analysis
 */

export interface BehavioralCaptureEngine {
  startCapture(): void;
  stopCapture(): void;
  getBehavioralMetrics(): BehavioralMetrics;
  onPatternDetected(callback: (pattern: BehavioralPattern) => void): void;
}

export interface BehavioralMetrics {
  typingSpeed: number;
  pausePatterns: number[];
  decisionTime: number;
  contextSwitches: number;
  fatigueLevel: number;
}

export interface BehavioralAction {
  type: ActionType;
  timestamp: number;
  duration: number;
  metadata: Record<string, any>;
}

export interface BehavioralPattern {
  id: string;
  userId: string;
  timestamp: Date;
  sequence: BehavioralAction[];
  context: ContextSnapshot;
  frequency: number;
  confidence: number;
}

export interface ContextSnapshot {
  fileType: string;
  projectContext: string;
  timeOfDay: number;
  sessionDuration: number;
}