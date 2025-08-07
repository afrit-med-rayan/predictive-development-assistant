import { BehavioralMetricsEngine, TemporalMetrics, FatigueIndicators } from '../../src/behavioral/metrics-engine';
import { BehavioralAction, ActionType } from '../../src/interfaces/behavioral';

describe('BehavioralMetricsEngine', () => {
  let engine: BehavioralMetricsEngine;
  const userId = 'test-user-123';

  beforeEach(() => {
    engine = new BehavioralMetricsEngine(userId);
  });

  describe('constructor', () => {
    it('should initialize with user ID and create new session', () => {
      const stats = engine.getSessionStatistics();
      
      expect(stats.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(stats.duration).toBeGreaterThanOrEqual(0);
      expect(stats.metricsCount).toBe(0);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate basic behavioral metrics from actions', () => {
      const actions: BehavioralAction[] = [
        {
          type: ActionType.KEYSTROKE,
          timestamp: 1000,
          duration: 0,
          metadata: {
            hashedKey: 'key_123',
            eventType: 'keydown',
            modifiers: { ctrl: false, shift: false, alt: false }
          }
        },
        {
          type: ActionType.KEYSTROKE,
          timestamp: 1200,
          duration: 0,
          metadata: {
            hashedKey: 'key_456',
            eventType: 'keydown',
            modifiers: { ctrl: false, shift: false, alt: false }
          }
        },
        {
          type: ActionType.CONTEXT_SWITCH,
          timestamp: 1300,
          duration: 100,
          metadata: { from: 'file1.ts', to: 'file2.ts' }
        }
      ];

      const metrics = engine.calculateMetrics(actions);

      expect(metrics).toHaveProperty('typingSpeed');
      expect(metrics).toHaveProperty('pausePatterns');
      expect(metrics).toHaveProperty('decisionTime');
      expect(metrics).toHaveProperty('contextSwitches');
      expect(metrics).toHaveProperty('fatigueLevel');
      
      expect(metrics.contextSwitches).toBe(1);
      expect(Array.isArray(metrics.pausePatterns)).toBe(true);
      expect(typeof metrics.typingSpeed).toBe('number');
    });

    it('should handle empty actions array', () => {
      const metrics = engine.calculateMetrics([]);

      expect(metrics.typingSpeed).toBe(0);
      expect(metrics.contextSwitches).toBe(0);
      expect(metrics.pausePatterns).toEqual([0, 0, 0]);
      expect(metrics.decisionTime).toBe(0);
      expect(metrics.fatigueLevel).toBe(0);
    });

    it('should store metrics in history', () => {
      const actions: BehavioralAction[] = [
        {
          type: ActionType.KEYSTROKE,
          timestamp: 1000,
          duration: 0,
          metadata: {
            hashedKey: 'key_123',
            eventType: 'keydown',
            modifiers: { ctrl: false, shift: false, alt: false }
          }
        }
      ];

      engine.calculateMetrics(actions);
      const history = engine.getMetricsHistory();

      expect(history).toHaveLength(1);
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('metrics');
      expect(history[0]).toHaveProperty('sessionId');
      expect(history[0]).toHaveProperty('duration');
    });
  });

  describe('detectFatigue', () => {
    it('should return default indicators with insufficient data', () => {
      const fatigue = engine.detectFatigue();

      expect(fatigue.typingSpeedDecline).toBe(0);
      expect(fatigue.increasedPauseFrequency).toBe(0);
      expect(fatigue.rhythmInconsistency).toBe(0);
      expect(fatigue.overallFatigueScore).toBe(0);
    });

    it('should detect fatigue with sufficient historical data', () => {
      // Simulate declining performance over time
      const baseTime = Date.now();
      
      // Early session - good performance
      for (let i = 0; i < 15; i++) {
        const actions: BehavioralAction[] = [
          {
            type: ActionType.KEYSTROKE,
            timestamp: baseTime + i * 100,
            duration: 0,
            metadata: {
              hashedKey: `key_${i}`,
              eventType: 'keydown',
              modifiers: { ctrl: false, shift: false, alt: false }
            }
          }
        ];
        engine.calculateMetrics(actions);
      }

      // Later session - declining performance (longer intervals)
      for (let i = 15; i < 25; i++) {
        const actions: BehavioralAction[] = [
          {
            type: ActionType.KEYSTROKE,
            timestamp: baseTime + i * 300, // Slower typing
            duration: 0,
            metadata: {
              hashedKey: `key_${i}`,
              eventType: 'keydown',
              modifiers: { ctrl: false, shift: false, alt: false }
            }
          }
        ];
        engine.calculateMetrics(actions);
      }

      const fatigue = engine.detectFatigue();

      expect(fatigue.overallFatigueScore).toBeGreaterThanOrEqual(0);
      expect(fatigue.overallFatigueScore).toBeLessThanOrEqual(1);
    });
  });

  describe('pattern storage', () => {
    it('should store patterns with temporal indexing', () => {
      const actions: BehavioralAction[] = [
        {
          type: ActionType.KEYSTROKE,
          timestamp: 1000,
          duration: 0,
          metadata: {
            hashedKey: 'key_123',
            eventType: 'keydown',
            modifiers: { ctrl: false, shift: false, alt: false }
          }
        }
      ];

      const metrics = engine.calculateMetrics(actions);
      engine.storePattern('typing_pattern_1', metrics);

      const patterns = engine.getCurrentSessionPatterns();
      expect(patterns.has('typing_pattern_1')).toBe(true);
      
      const patternHistory = patterns.get('typing_pattern_1')!;
      expect(patternHistory).toHaveLength(1);
      expect(patternHistory[0].metrics).toEqual(metrics);
    });

    it('should retrieve patterns by time range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const actions: BehavioralAction[] = [
        {
          type: ActionType.KEYSTROKE,
          timestamp: 1000,
          duration: 0,
          metadata: {
            hashedKey: 'key_123',
            eventType: 'keydown',
            modifiers: { ctrl: false, shift: false, alt: false }
          }
        }
      ];

      const metrics = engine.calculateMetrics(actions);
      engine.storePattern('test_pattern', metrics);

      const recentPatterns = engine.getPatternsByTimeRange('test_pattern', oneHourAgo, now);
      const oldPatterns = engine.getPatternsByTimeRange('test_pattern', twoHoursAgo, oneHourAgo);

      expect(recentPatterns.length).toBeGreaterThan(0);
      expect(oldPatterns.length).toBe(0);
    });
  });

  describe('session management', () => {
    it('should start new session and clear data', () => {
      const actions: BehavioralAction[] = [
        {
          type: ActionType.KEYSTROKE,
          timestamp: 1000,
          duration: 0,
          metadata: {
            hashedKey: 'key_123',
            eventType: 'keydown',
            modifiers: { ctrl: false, shift: false, alt: false }
          }
        }
      ];

      const initialStats = engine.getSessionStatistics();
      engine.calculateMetrics(actions);
      
      const statsAfterMetrics = engine.getSessionStatistics();
      expect(statsAfterMetrics.metricsCount).toBe(1);

      engine.startNewSession();
      const statsAfterNewSession = engine.getSessionStatistics();
      
      expect(statsAfterNewSession.sessionId).not.toBe(initialStats.sessionId);
      expect(statsAfterNewSession.metricsCount).toBe(0);
    });

    it('should provide comprehensive session statistics', () => {
      const actions: BehavioralAction[] = [
        {
          type: ActionType.KEYSTROKE,
          timestamp: 1000,
          duration: 0,
          metadata: {
            hashedKey: 'key_123',
            eventType: 'keydown',
            modifiers: { ctrl: false, shift: false, alt: false }
          }
        },
        {
          type: ActionType.CONTEXT_SWITCH,
          timestamp: 1100,
          duration: 50,
          metadata: { from: 'file1.ts', to: 'file2.ts' }
        }
      ];

      engine.calculateMetrics(actions);
      const stats = engine.getSessionStatistics();

      expect(stats).toHaveProperty('sessionId');
      expect(stats).toHaveProperty('duration');
      expect(stats).toHaveProperty('metricsCount');
      expect(stats).toHaveProperty('averageTypingSpeed');
      expect(stats).toHaveProperty('totalContextSwitches');
      expect(stats).toHaveProperty('fatigueProgression');

      expect(stats.metricsCount).toBe(1);
      expect(stats.totalContextSwitches).toBe(1);
      expect(typeof stats.averageTypingSpeed).toBe('number');
    });
  });

  describe('metrics history', () => {
    it('should maintain metrics history with limit', () => {
      const actions: BehavioralAction[] = [
        {
          type: ActionType.KEYSTROKE,
          timestamp: 1000,
          duration: 0,
          metadata: {
            hashedKey: 'key_123',
            eventType: 'keydown',
            modifiers: { ctrl: false, shift: false, alt: false }
          }
        }
      ];

      // Add multiple metrics
      for (let i = 0; i < 5; i++) {
        engine.calculateMetrics(actions);
      }

      const allHistory = engine.getMetricsHistory();
      const limitedHistory = engine.getMetricsHistory(3);

      expect(allHistory).toHaveLength(5);
      expect(limitedHistory).toHaveLength(3);
      
      // Should return the most recent entries
      expect(limitedHistory).toEqual(allHistory.slice(-3));
    });

    it('should maintain temporal ordering in history', () => {
      const actions: BehavioralAction[] = [
        {
          type: ActionType.KEYSTROKE,
          timestamp: 1000,
          duration: 0,
          metadata: {
            hashedKey: 'key_123',
            eventType: 'keydown',
            modifiers: { ctrl: false, shift: false, alt: false }
          }
        }
      ];

      const timestamps: number[] = [];
      
      for (let i = 0; i < 3; i++) {
        engine.calculateMetrics(actions);
        timestamps.push(Date.now());
        // Small delay to ensure different timestamps
        if (i < 2) {
          // Simulate time passing
          jest.advanceTimersByTime(10);
        }
      }

      const history = engine.getMetricsHistory();
      
      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          history[i - 1].timestamp.getTime()
        );
      }
    });
  });

  describe('data privacy and cleanup', () => {
    it('should clear all data when requested', () => {
      const actions: BehavioralAction[] = [
        {
          type: ActionType.KEYSTROKE,
          timestamp: 1000,
          duration: 0,
          metadata: {
            hashedKey: 'key_123',
            eventType: 'keydown',
            modifiers: { ctrl: false, shift: false, alt: false }
          }
        }
      ];

      const metrics = engine.calculateMetrics(actions);
      engine.storePattern('test_pattern', metrics);

      // Verify data exists
      expect(engine.getMetricsHistory()).toHaveLength(1);
      expect(engine.getCurrentSessionPatterns().size).toBeGreaterThan(0);

      // Clear all data
      engine.clearAllData();

      // Verify data is cleared
      expect(engine.getMetricsHistory()).toHaveLength(0);
      expect(engine.getCurrentSessionPatterns().size).toBe(0);
      
      const stats = engine.getSessionStatistics();
      expect(stats.metricsCount).toBe(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle actions without keystroke metadata', () => {
      const actions: BehavioralAction[] = [
        {
          type: ActionType.CONTEXT_SWITCH,
          timestamp: 1000,
          duration: 100,
          metadata: { from: 'file1.ts', to: 'file2.ts' }
        },
        {
          type: ActionType.MOUSE_CLICK,
          timestamp: 1100,
          duration: 10,
          metadata: { x: 100, y: 200 }
        }
      ];

      const metrics = engine.calculateMetrics(actions);

      expect(metrics.typingSpeed).toBe(0);
      expect(metrics.contextSwitches).toBe(1);
      expect(metrics.pausePatterns).toEqual([0, 0, 0]);
    });

    it('should handle malformed keystroke actions', () => {
      const actions: BehavioralAction[] = [
        {
          type: ActionType.KEYSTROKE,
          timestamp: 1000,
          duration: 0,
          metadata: {} // Missing required fields
        },
        {
          type: ActionType.KEYSTROKE,
          timestamp: 1100,
          duration: 0,
          metadata: {
            hashedKey: 'key_123'
            // Missing other fields
          }
        }
      ];

      expect(() => engine.calculateMetrics(actions)).not.toThrow();
      
      const metrics = engine.calculateMetrics(actions);
      expect(typeof metrics.typingSpeed).toBe('number');
    });

    it('should handle very large datasets gracefully', () => {
      const actions: BehavioralAction[] = [
        {
          type: ActionType.KEYSTROKE,
          timestamp: 1000,
          duration: 0,
          metadata: {
            hashedKey: 'key_123',
            eventType: 'keydown',
            modifiers: { ctrl: false, shift: false, alt: false }
          }
        }
      ];

      // Add many metrics to test buffer management
      for (let i = 0; i < 1500; i++) {
        engine.calculateMetrics(actions);
      }

      const history = engine.getMetricsHistory();
      expect(history.length).toBeLessThanOrEqual(1000); // Should respect max history size
    });

    it('should handle concurrent pattern storage', () => {
      const actions: BehavioralAction[] = [
        {
          type: ActionType.KEYSTROKE,
          timestamp: 1000,
          duration: 0,
          metadata: {
            hashedKey: 'key_123',
            eventType: 'keydown',
            modifiers: { ctrl: false, shift: false, alt: false }
          }
        }
      ];

      const metrics = engine.calculateMetrics(actions);
      
      // Store multiple patterns simultaneously
      engine.storePattern('pattern_1', metrics);
      engine.storePattern('pattern_2', metrics);
      engine.storePattern('pattern_1', metrics); // Duplicate pattern

      const patterns = engine.getCurrentSessionPatterns();
      
      expect(patterns.has('pattern_1')).toBe(true);
      expect(patterns.has('pattern_2')).toBe(true);
      expect(patterns.get('pattern_1')!.length).toBe(2); // Should have 2 entries
      expect(patterns.get('pattern_2')!.length).toBe(1);
    });
  });
});