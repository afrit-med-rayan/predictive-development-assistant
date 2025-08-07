/**
 * Privacy management and data protection
 */

export interface PrivacyManager {
  applyDifferentialPrivacy(data: any[], epsilon: number): any[];
  anonymizeData(data: any[]): any[];
  checkPrivacyCompliance(operation: string): boolean;
  getPrivacyBudget(): number;
  resetPrivacyBudget(): void;
}

export interface PrivacyConfiguration {
  enableDifferentialPrivacy: boolean;
  privacyBudget: number;
  noiseLevel: number;
  dataRetentionPeriod: number;
  anonymizationLevel: 'basic' | 'advanced' | 'strict';
}