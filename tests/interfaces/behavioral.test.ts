import { BehavioralMetrics, BehavioralAction, ActionType } from '../../src/interfaces/behavioral';

describe('Behavioral Interfaces', () => {
  describe('BehavioralMetrics', () => {
    it('should have correct structure', () => {
      const metrics: BehavioralMetrics = {
        typingSpeed: 120,
        pausePatterns: [100, 200, 150],
        decisionTime: 500,
        contextSwitches: 3,
        fatigueLevel: 0.2
      };

      expect(metrics.typingSpeed).toBe(120);
      expect(metrics.pausePatterns).toHaveLength(3);
      expect(metrics.decisionTime).toBe(500);
      expect(metrics.contextSwitches).toBe(3);
      expect(metrics.fatigueLevel).toBe(0.2);
    });
  });

  describe('BehavioralAction', () => {
    it('should have correct structure', () => {
      const action: BehavioralAction = {
        type: ActionType.KEYSTROKE,
        timestamp: Date.now(),
        duration: 50,
        metadata: { key: 'a' }
      };

      expect(action.type).toBe(ActionType.KEYSTROKE);
      expect(typeof action.timestamp).toBe('number');
      expect(action.duration).toBe(50);
      expect(action.metadata.key).toBe('a');
    });
  });
});