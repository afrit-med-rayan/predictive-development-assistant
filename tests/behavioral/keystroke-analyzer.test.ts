import { KeystrokeTimingAnalyzer, KeystrokeEvent, TimingPattern } from '../../src/behavioral/keystroke-analyzer';
import { ActionType } from '../../src/interfaces/common';

describe('KeystrokeTimingAnalyzer', () => {
  let analyzer: KeystrokeTimingAnalyzer;

  beforeEach(() => {
    analyzer = new KeystrokeTimingAnalyzer();
  });

  describe('processKeystroke', () => {
    it('should process keystroke events and maintain buffer size', () => {
      const event: KeystrokeEvent = {
        key: 'a',
        timestamp: Date.now(),
        type: 'keydown',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      };

      analyzer.processKeystroke(event);
      const actions = analyzer.toBehavioralActions();
      
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe(ActionType.KEYSTROKE);
    });

    it('should maintain buffer size limit', () => {
      // Add more than buffer size events
      for (let i = 0; i < 150; i++) {
        const event: KeystrokeEvent = {
          key: String.fromCharCode(97 + (i % 26)), // a-z cycling
          timestamp: Date.now() + i * 100,
          type: 'keydown',
          ctrlKey: false,
          shiftKey: false,
          altKey: false
        };
        analyzer.processKeystroke(event);
      }

      const actions = analyzer.toBehavioralActions();
      expect(actions.length).toBeLessThanOrEqual(100); // Buffer size limit
    });

    it('should hash keys for privacy preservation', () => {
      const event1: KeystrokeEvent = {
        key: 'a',
        timestamp: Date.now(),
        type: 'keydown',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      };

      const event2: KeystrokeEvent = {
        key: 'b',
        timestamp: Date.now() + 100,
        type: 'keydown',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      };

      analyzer.processKeystroke(event1);
      analyzer.processKeystroke(event2);
      
      const actions = analyzer.toBehavioralActions();
      
      // Keys should be hashed, not stored as original
      expect(actions[0].metadata.hashedKey).not.toBe('a');
      expect(actions[1].metadata.hashedKey).not.toBe('b');
      expect(actions[0].metadata.hashedKey).toMatch(/^key_\d+$/);
      expect(actions[1].metadata.hashedKey).toMatch(/^key_\d+$/);
    });
  });

  describe('extractTimingPatterns', () => {
    it('should return default pattern with insufficient data', () => {
      const pattern = analyzer.extractTimingPatterns();
      
      expect(pattern.averageInterval).toBe(0);
      expect(pattern.variance).toBe(0);
      expect(pattern.rhythm).toEqual([]);
      expect(pattern.pauseCount).toBe(0);
      expect(pattern.burstCount).toBe(0);
    });

    it('should calculate timing patterns correctly', () => {
      // Add consistent typing pattern
      const baseTime = Date.now();
      const intervals = [200, 180, 220, 190, 210]; // Consistent ~200ms intervals
      let currentTime = baseTime;
      
      // First keystroke
      analyzer.processKeystroke({
        key: 'a',
        timestamp: currentTime,
        type: 'keydown',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      });
      
      // Subsequent keystrokes with intervals
      for (let i = 0; i < intervals.length; i++) {
        currentTime += intervals[i];
        const event: KeystrokeEvent = {
          key: String.fromCharCode(98 + i), // b, c, d, e, f
          timestamp: currentTime,
          type: 'keydown',
          ctrlKey: false,
          shiftKey: false,
          altKey: false
        };
        analyzer.processKeystroke(event);
      }

      const pattern = analyzer.extractTimingPatterns();
      
      expect(pattern.averageInterval).toBeCloseTo(200, 10);
      expect(pattern.variance).toBeGreaterThan(0);
      expect(pattern.rhythm.length).toBeGreaterThan(0);
    });

    it('should detect pauses and bursts correctly', () => {
      const baseTime = Date.now();
      let currentTime = baseTime;
      
      // First keystroke
      analyzer.processKeystroke({
        key: 'a',
        timestamp: currentTime,
        type: 'keydown',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      });
      
      // Burst sequence
      currentTime += 50;
      analyzer.processKeystroke({
        key: 'b',
        timestamp: currentTime,
        type: 'keydown',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      });
      
      currentTime += 60;
      analyzer.processKeystroke({
        key: 'c',
        timestamp: currentTime,
        type: 'keydown',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      });
      
      // Long pause
      currentTime += 1500;
      analyzer.processKeystroke({
        key: 'd',
        timestamp: currentTime,
        type: 'keydown',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      });
      
      // Normal interval
      currentTime += 200;
      analyzer.processKeystroke({
        key: 'e',
        timestamp: currentTime,
        type: 'keydown',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      });

      const pattern = analyzer.extractTimingPatterns();
      
      expect(pattern.pauseCount).toBe(1); // One pause > 1000ms
      expect(pattern.burstCount).toBe(2); // Two bursts < 100ms
    });
  });

  describe('analyzeStatistics', () => {
    beforeEach(() => {
      // Add sample data for analysis
      const baseTime = Date.now();
      const intervals = [200, 180, 220, 190, 210, 250, 180, 200, 1200, 190]; // Mix of normal and pause
      let currentTime = baseTime;
      
      // First keystroke
      analyzer.processKeystroke({
        key: 'a',
        timestamp: currentTime,
        type: 'keydown',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      });
      
      // Subsequent keystrokes with intervals
      for (let i = 0; i < intervals.length; i++) {
        currentTime += intervals[i];
        const event: KeystrokeEvent = {
          key: String.fromCharCode(98 + i),
          timestamp: currentTime,
          type: 'keydown',
          ctrlKey: false,
          shiftKey: false,
          altKey: false
        };
        analyzer.processKeystroke(event);
      }
    });

    it('should calculate typing speed correctly', () => {
      const metrics = analyzer.analyzeStatistics();
      
      expect(metrics.typingSpeed).toBeGreaterThan(0);
      expect(typeof metrics.typingSpeed).toBe('number');
    });

    it('should analyze pause patterns', () => {
      const metrics = analyzer.analyzeStatistics();
      
      expect(metrics.pausePatterns).toHaveLength(3); // [short, medium, long]
      expect(metrics.pausePatterns.every(count => count >= 0)).toBe(true);
    });

    it('should calculate decision time', () => {
      const metrics = analyzer.analyzeStatistics();
      
      expect(metrics.decisionTime).toBeGreaterThan(0);
      expect(typeof metrics.decisionTime).toBe('number');
    });

    it('should calculate rhythm consistency', () => {
      const metrics = analyzer.analyzeStatistics();
      
      expect(metrics.rhythmConsistency).toBeGreaterThanOrEqual(0);
      expect(metrics.rhythmConsistency).toBeLessThanOrEqual(1);
    });

    it('should detect fatigue indicators', () => {
      const metrics = analyzer.analyzeStatistics();
      
      expect(metrics.fatigueIndicators).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.fatigueIndicators).toBe('number');
    });
  });

  describe('toBehavioralActions', () => {
    it('should convert keystroke events to behavioral actions', () => {
      const event: KeystrokeEvent = {
        key: 'a',
        timestamp: 1000,
        type: 'keydown',
        ctrlKey: true,
        shiftKey: false,
        altKey: false
      };

      analyzer.processKeystroke(event);
      const actions = analyzer.toBehavioralActions();
      
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual({
        type: ActionType.KEYSTROKE,
        timestamp: 1000,
        duration: 0,
        metadata: {
          hashedKey: expect.stringMatching(/^key_\d+$/),
          modifiers: {
            ctrl: true,
            shift: false,
            alt: false
          },
          eventType: 'keydown'
        }
      });
    });

    it('should handle multiple events correctly', () => {
      const events: KeystrokeEvent[] = [
        {
          key: 'a',
          timestamp: 1000,
          type: 'keydown',
          ctrlKey: false,
          shiftKey: false,
          altKey: false
        },
        {
          key: 'b',
          timestamp: 1200,
          type: 'keydown',
          ctrlKey: false,
          shiftKey: true,
          altKey: false
        }
      ];

      events.forEach(event => analyzer.processKeystroke(event));
      const actions = analyzer.toBehavioralActions();
      
      expect(actions).toHaveLength(2);
      expect(actions[0].timestamp).toBe(1000);
      expect(actions[1].timestamp).toBe(1200);
      expect(actions[1].metadata.modifiers.shift).toBe(true);
    });
  });

  describe('clearData', () => {
    it('should clear all stored data', () => {
      // Add some data
      const event: KeystrokeEvent = {
        key: 'a',
        timestamp: Date.now(),
        type: 'keydown',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      };

      analyzer.processKeystroke(event);
      expect(analyzer.toBehavioralActions()).toHaveLength(1);

      // Clear data
      analyzer.clearData();
      expect(analyzer.toBehavioralActions()).toHaveLength(0);
      
      const pattern = analyzer.extractTimingPatterns();
      expect(pattern.averageInterval).toBe(0);
    });
  });

  describe('privacy preservation', () => {
    it('should not store actual key content', () => {
      const sensitiveKeys = ['password', 'secret', 'token'];
      
      sensitiveKeys.forEach((key, index) => {
        const event: KeystrokeEvent = {
          key,
          timestamp: Date.now() + index * 100,
          type: 'keydown',
          ctrlKey: false,
          shiftKey: false,
          altKey: false
        };
        analyzer.processKeystroke(event);
      });

      const actions = analyzer.toBehavioralActions();
      
      // Verify no actual key content is stored
      actions.forEach(action => {
        expect(action.metadata.hashedKey).not.toContain('password');
        expect(action.metadata.hashedKey).not.toContain('secret');
        expect(action.metadata.hashedKey).not.toContain('token');
        expect(action.metadata.hashedKey).toMatch(/^key_\d+$/);
      });
    });

    it('should produce consistent hashes for same keys', () => {
      const event1: KeystrokeEvent = {
        key: 'a',
        timestamp: 1000,
        type: 'keydown',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      };

      const event2: KeystrokeEvent = {
        key: 'a',
        timestamp: 2000,
        type: 'keydown',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      };

      analyzer.processKeystroke(event1);
      analyzer.processKeystroke(event2);
      
      const actions = analyzer.toBehavioralActions();
      
      // Same key should produce same hash
      expect(actions[0].metadata.hashedKey).toBe(actions[1].metadata.hashedKey);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid keystrokes', () => {
      const baseTime = Date.now();
      
      // Simulate very rapid typing (10ms intervals)
      for (let i = 0; i < 20; i++) {
        const event: KeystrokeEvent = {
          key: String.fromCharCode(97 + (i % 26)),
          timestamp: baseTime + i * 10,
          type: 'keydown',
          ctrlKey: false,
          shiftKey: false,
          altKey: false
        };
        analyzer.processKeystroke(event);
      }

      const pattern = analyzer.extractTimingPatterns();
      const metrics = analyzer.analyzeStatistics();
      
      expect(pattern.burstCount).toBeGreaterThan(0);
      expect(metrics.typingSpeed).toBeGreaterThan(0);
    });

    it('should handle long pauses', () => {
      const baseTime = Date.now();
      
      // First keystroke
      analyzer.processKeystroke({
        key: 'a',
        timestamp: baseTime,
        type: 'keydown',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      });
      
      // Long pause (10 seconds)
      analyzer.processKeystroke({
        key: 'b',
        timestamp: baseTime + 10000,
        type: 'keydown',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      });
      
      // Normal interval
      analyzer.processKeystroke({
        key: 'c',
        timestamp: baseTime + 10200,
        type: 'keydown',
        ctrlKey: false,
        shiftKey: false,
        altKey: false
      });

      const pattern = analyzer.extractTimingPatterns();
      const metrics = analyzer.analyzeStatistics();
      
      expect(pattern.pauseCount).toBeGreaterThan(0);
      expect(metrics.decisionTime).toBeGreaterThan(1000);
    });

    it('should handle empty data gracefully', () => {
      const pattern = analyzer.extractTimingPatterns();
      const metrics = analyzer.analyzeStatistics();
      const actions = analyzer.toBehavioralActions();
      
      expect(pattern).toBeDefined();
      expect(metrics).toBeDefined();
      expect(actions).toEqual([]);
      expect(metrics.typingSpeed).toBe(0);
    });
  });
});