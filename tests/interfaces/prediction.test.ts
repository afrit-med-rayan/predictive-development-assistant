import { CodePrediction, PredictionType } from '../../src/interfaces/prediction';

describe('Prediction Interfaces', () => {
  describe('CodePrediction', () => {
    it('should have correct structure', () => {
      const prediction: CodePrediction = {
        code: 'function test() { return true; }',
        confidence: 0.85,
        reasoning: 'Based on current context and patterns',
        type: PredictionType.FUNCTION_GENERATION
      };

      expect(prediction.code).toBe('function test() { return true; }');
      expect(prediction.confidence).toBe(0.85);
      expect(prediction.reasoning).toBe('Based on current context and patterns');
      expect(prediction.type).toBe(PredictionType.FUNCTION_GENERATION);
    });
  });
});