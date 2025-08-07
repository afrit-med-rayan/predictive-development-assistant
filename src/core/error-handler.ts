/**
 * Error handling and recovery mechanisms
 */

export enum RecoveryAction {
  FALLBACK_TO_SIMPLE_MODEL = 'fallback_to_simple_model',
  RESTART_COMPONENT = 'restart_component',
  DISABLE_FEATURE = 'disable_feature',
  FULL_SYSTEM_RESET = 'full_system_reset'
}

export interface ModelError {
  type: string;
  message: string;
  component: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DataCorruption {
  source: string;
  affectedData: string[];
  detectedAt: Date;
  severity: 'minor' | 'major' | 'critical';
}

export interface SystemPerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  throughput: number;
}

export interface PrivacyViolation {
  type: string;
  description: string;
  affectedData: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorHandler {
  handleModelError(error: ModelError): RecoveryAction;
  handleDataCorruption(corruption: DataCorruption): void;
  handlePerformanceIssue(metrics: SystemPerformanceMetrics): void;
  handlePrivacyViolation(violation: PrivacyViolation): void;
}