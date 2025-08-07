import { ModelError, RecoveryAction } from '../../src/core/error-handler';

describe('Error Handler', () => {
  describe('ModelError', () => {
    it('should have correct structure', () => {
      const error: ModelError = {
        type: 'prediction_failure',
        message: 'Model failed to generate prediction',
        component: 'PredictionEngine',
        timestamp: new Date(),
        severity: 'high'
      };

      expect(error.type).toBe('prediction_failure');
      expect(error.message).toBe('Model failed to generate prediction');
      expect(error.component).toBe('PredictionEngine');
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.severity).toBe('high');
    });
  });

  describe('RecoveryAction', () => {
    it('should have correct enum values', () => {
      expect(RecoveryAction.FALLBACK_TO_SIMPLE_MODEL).toBe('fallback_to_simple_model');
      expect(RecoveryAction.RESTART_COMPONENT).toBe('restart_component');
      expect(RecoveryAction.DISABLE_FEATURE).toBe('disable_feature');
      expect(RecoveryAction.FULL_SYSTEM_RESET).toBe('full_system_reset');
    });
  });
});