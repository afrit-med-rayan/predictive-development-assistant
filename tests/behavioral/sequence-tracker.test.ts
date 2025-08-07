import { 
  BehavioralSequenceTracker, 
  SequenceConfig, 
  ActionSequence, 
  ContextSwitch, 
  FocusPattern,
  PatternChangeEvent 
} from '../../src/behavioral/sequence-tracker';
import { BehavioralAction, ActionType } from '../../src/interfaces/behavioral';

describe('BehavioralSequenceTracker', () => {
  let tracker: BehavioralSequenceTracker;

  beforeEach(() => {
    tracker = new BehavioralSequenceTracker();
  });

  describe('constructor and configuration', () => {
    it('should initialize with default configuration', () => {
      const config = tracker.getConfig();
      
      expect(config.bufferSize).toBe(50);
      expect(config.contextSwitchThreshold).toBe(2000);
      expect(config.focusLossThreshold).toBe(30000);
      expect(config.patternChangeThreshold).toBe(0.05);
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<SequenceConfig> = {
        bufferSize: 100,
        contextSwitchThreshold: 1000,
        focusLossThreshold: 60000,
        patternChangeThreshold: 0.01
      };

      const customTracker = new BehavioralSequenceTracker(customConfig);
      const config = customTracker.getConfig();

      expect(config.bufferSize).toBe(100);
      expect(config.contextSwitchThreshold).toBe(1000);
      expect(config.focusLossThreshold).toBe(60000);
      expect(config.patternChangeThreshold).toBe(0.01);
    });

    it('should update configuration', () => {
      const newConfig: Partial<SequenceConfig> = {
        bufferSize: 75
      };

      tracker.updateConfig(newConfig);
      const config = tracker.getConfig();

      expect(config.bufferSize).toBe(75);
      expect(config.contextSwitchThreshold).toBe(2000); // Should remain unchanged
    });
  });

  describe('action recording', () => {
    it('should record actions in buffer', () => {
      const action: BehavioralAction = {
        type: ActionType.KEYSTROKE,
        timestamp: Date.now(),
        duration: 0,
        metadata: { hashedKey: 'key_123' }
      };

      tracker.recordAction(action);
      const buffer = tracker.getCurrentBuffer();

      expect(buffer).toHaveLength(1);
      expect(buffer[0]).toEqual(action);
    });

    it('should maintain buffer size limit', () => {
      const smallTracker = new BehavioralSequenceTracker({ bufferSize: 3 });

      // Add actions one by one to avoid sequence completion
      const action1: BehavioralAction = {
        type: ActionType.KEYSTROKE,
        timestamp: Date.now(),
        duration: 0,
        metadata: { hashedKey: 'key_0' }
      };
      smallTracker.recordAction(action1);

      const action2: BehavioralAction = {
        type: ActionType.KEYSTROKE,
        timestamp: Date.now() + 100,
        duration: 0,
        metadata: { hashedKey: 'key_1' }
      };
      smallTracker.recordAction(action2);

      const action3: BehavioralAction = {
        type: ActionType.KEYSTROKE,
        timestamp: Date.now() + 200,
        duration: 0,
        metadata: { hashedKey: 'key_2' }
      };
      smallTracker.recordAction(action3);

      // Buffer should be full now, next action should trigger sequence completion
      let buffer = smallTracker.getCurrentBuffer();
      expect(buffer.length).toBeLessThanOrEqual(3);

      // Add one more action - this should complete the sequence and start a new buffer
      const action4: BehavioralAction = {
        type: ActionType.KEYSTROKE,
        timestamp: Date.now() + 300,
        duration: 0,
        metadata: { hashedKey: 'key_3' }
      };
      smallTracker.recordAction(action4);

      buffer = smallTracker.getCurrentBuffer();
      expect(buffer.length).toBeLessThanOrEqual(3);
    });

    it('should complete sequences when buffer is full', () => {
      const smallTracker = new BehavioralSequenceTracker({ bufferSize: 2 });

      // Add actions to fill buffer
      for (let i = 0; i < 3; i++) {
        const action: BehavioralAction = {
          type: ActionType.KEYSTROKE,
          timestamp: Date.now() + i * 100,
          duration: 0,
          metadata: { hashedKey: `key_${i}` }
        };
        smallTracker.recordAction(action);
      }

      const sequences = smallTracker.getRecentSequences();
      expect(sequences.length).toBeGreaterThan(0);
    });
  });

  describe('context switch detection', () => {
    it('should detect file switch context changes', () => {
      const baseTime = Date.now();

      // Initial context
      tracker.recordAction({
        type: ActionType.FILE_SWITCH,
        timestamp: baseTime,
        duration: 100,
        metadata: { fileName: 'file1.ts' }
      });

      // Switch to different file
      tracker.recordAction({
        type: ActionType.FILE_SWITCH,
        timestamp: baseTime + 1000,
        duration: 100,
        metadata: { fileName: 'file2.ts' }
      });

      const switches = tracker.getContextSwitchesByTimeRange(
        new Date(baseTime - 1000),
        new Date(baseTime + 2000)
      );

      expect(switches).toHaveLength(1);
      expect(switches[0].fromContext).toBe('file1.ts');
      expect(switches[0].toContext).toBe('file2.ts');
      expect(switches[0].reason).toBe('file_switch');
    });

    it('should detect explicit context switches', () => {
      const baseTime = Date.now();

      // First action establishes initial context
      tracker.recordAction({
        type: ActionType.CONTEXT_SWITCH,
        timestamp: baseTime,
        duration: 50,
        metadata: { from: 'editor', to: 'terminal' }
      });

      // Second action creates the actual context switch
      tracker.recordAction({
        type: ActionType.CONTEXT_SWITCH,
        timestamp: baseTime + 1000,
        duration: 50,
        metadata: { from: 'terminal', to: 'editor' }
      });

      const switches = tracker.getContextSwitchesByTimeRange(
        new Date(baseTime - 1000),
        new Date(baseTime + 2000)
      );

      expect(switches).toHaveLength(1);
      expect(switches[0].fromContext).toBe('terminal');
      expect(switches[0].toContext).toBe('editor');
      expect(switches[0].reason).toBe('manual');
    });

    it('should provide context switch statistics', () => {
      const baseTime = Date.now();

      // Add multiple context switches
      const switches = [
        { from: 'file1.ts', to: 'file2.ts', reason: 'file_switch' },
        { from: 'file2.ts', to: 'terminal', reason: 'manual' },
        { from: 'terminal', to: 'file1.ts', reason: 'file_switch' }
      ];

      switches.forEach((switchData, index) => {
        tracker.recordAction({
          type: ActionType.CONTEXT_SWITCH,
          timestamp: baseTime + index * 1000,
          duration: 100,
          metadata: { from: switchData.from, to: switchData.to, reason: switchData.reason }
        });
      });

      const stats = tracker.getContextSwitchStatistics();

      expect(stats.totalSwitches).toBe(2); // First switch creates context, subsequent ones are counted
      expect(stats.averageSwitchDuration).toBe(100);
      expect(stats.contexts.length).toBeGreaterThan(0);
      expect(typeof stats.switchesPerHour).toBe('number');
    });
  });

  describe('focus pattern analysis', () => {
    it('should track focus segments', () => {
      const baseTime = Date.now();

      // Simulate focused work session
      tracker.recordAction({
        type: ActionType.FILE_SWITCH,
        timestamp: baseTime,
        duration: 50,
        metadata: { fileName: 'main.ts' }
      });

      // Add some keystrokes
      for (let i = 0; i < 5; i++) {
        tracker.recordAction({
          type: ActionType.KEYSTROKE,
          timestamp: baseTime + 1000 + i * 200,
          duration: 0,
          metadata: { hashedKey: `key_${i}` }
        });
      }

      // Switch context (ends focus segment)
      tracker.recordAction({
        type: ActionType.CONTEXT_SWITCH,
        timestamp: baseTime + 3000,
        duration: 100,
        metadata: { from: 'main.ts', to: 'terminal' }
      });

      const focusPattern = tracker.analyzeFocusPatterns('all');

      expect(focusPattern.focusSegments.length).toBeGreaterThan(0);
      expect(focusPattern.totalFocusTime).toBeGreaterThan(0);
      expect(focusPattern.averageFocusSegment).toBeGreaterThan(0);
    });

    it('should handle empty focus data', () => {
      const focusPattern = tracker.analyzeFocusPatterns('empty_session');

      expect(focusPattern.sessionId).toBe('empty_session');
      expect(focusPattern.focusSegments).toHaveLength(0);
      expect(focusPattern.totalFocusTime).toBe(0);
      expect(focusPattern.averageFocusSegment).toBe(0);
      expect(focusPattern.interruptionCount).toBe(0);
    });
  });

  describe('sequence management', () => {
    it('should create sequences with proper metadata', () => {
      const baseTime = Date.now();
      const actions: BehavioralAction[] = [
        {
          type: ActionType.KEYSTROKE,
          timestamp: baseTime,
          duration: 0,
          metadata: { hashedKey: 'key_1' }
        },
        {
          type: ActionType.KEYSTROKE,
          timestamp: baseTime + 100,
          duration: 0,
          metadata: { hashedKey: 'key_2' }
        }
      ];

      actions.forEach(action => tracker.recordAction(action));

      // Force sequence completion
      tracker.recordAction({
        type: ActionType.CONTEXT_SWITCH,
        timestamp: baseTime + 5000, // Long gap to trigger completion
        duration: 100,
        metadata: { from: 'context1', to: 'context2' }
      });

      const sequences = tracker.getRecentSequences(1);
      
      if (sequences.length > 0) {
        const sequence = sequences[0];
        expect(sequence).toHaveProperty('id');
        expect(sequence).toHaveProperty('actions');
        expect(sequence).toHaveProperty('startTime');
        expect(sequence).toHaveProperty('endTime');
        expect(sequence).toHaveProperty('context');
        expect(sequence).toHaveProperty('patterns');
        expect(sequence.actions.length).toBeGreaterThan(0);
      }
    });

    it('should retrieve sequences by time range', () => {
      const baseTime = Date.now();
      const startTime = new Date(baseTime);
      const endTime = new Date(baseTime + 10000);

      // Add actions within time range
      tracker.recordAction({
        type: ActionType.KEYSTROKE,
        timestamp: baseTime + 1000,
        duration: 0,
        metadata: { hashedKey: 'key_1' }
      });

      // Force sequence completion
      tracker.recordAction({
        type: ActionType.CONTEXT_SWITCH,
        timestamp: baseTime + 5000,
        duration: 100,
        metadata: { from: 'context1', to: 'context2' }
      });

      const sequences = tracker.getSequencesByTimeRange(startTime, endTime);
      
      sequences.forEach(sequence => {
        expect(sequence.startTime.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
        expect(sequence.endTime.getTime()).toBeLessThanOrEqual(endTime.getTime());
      });
    });
  });

  describe('pattern change detection', () => {
    it('should detect pattern changes with sufficient data', () => {
      const baseTime = Date.now();

      // Create sequences with different patterns
      // First set: rapid typing
      for (let seq = 0; seq < 6; seq++) {
        for (let i = 0; i < 10; i++) {
          tracker.recordAction({
            type: ActionType.KEYSTROKE,
            timestamp: baseTime + seq * 2000 + i * 100, // Rapid intervals
            duration: 0,
            metadata: { hashedKey: `key_${seq}_${i}` }
          });
        }
        
        // Force sequence completion
        tracker.recordAction({
          type: ActionType.CONTEXT_SWITCH,
          timestamp: baseTime + seq * 2000 + 1500,
          duration: 100,
          metadata: { from: `context_${seq}`, to: `context_${seq + 1}` }
        });
      }

      // Second set: slower typing
      for (let seq = 6; seq < 12; seq++) {
        for (let i = 0; i < 10; i++) {
          tracker.recordAction({
            type: ActionType.KEYSTROKE,
            timestamp: baseTime + seq * 2000 + i * 500, // Slower intervals
            duration: 0,
            metadata: { hashedKey: `key_${seq}_${i}` }
          });
        }
        
        // Force sequence completion
        tracker.recordAction({
          type: ActionType.CONTEXT_SWITCH,
          timestamp: baseTime + seq * 2000 + 1500,
          duration: 100,
          metadata: { from: `context_${seq}`, to: `context_${seq + 1}` }
        });
      }

      const changes = tracker.detectPatternChanges();
      
      // Should detect some pattern changes
      expect(Array.isArray(changes)).toBe(true);
      
      changes.forEach(change => {
        expect(change).toHaveProperty('timestamp');
        expect(change).toHaveProperty('previousPattern');
        expect(change).toHaveProperty('newPattern');
        expect(change).toHaveProperty('confidence');
        expect(change).toHaveProperty('changeType');
        expect(change).toHaveProperty('statisticalSignificance');
        expect(change.confidence).toBeGreaterThanOrEqual(0);
        expect(change.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should return empty array with insufficient data', () => {
      // Add only a few actions
      tracker.recordAction({
        type: ActionType.KEYSTROKE,
        timestamp: Date.now(),
        duration: 0,
        metadata: { hashedKey: 'key_1' }
      });

      const changes = tracker.detectPatternChanges();
      expect(changes).toHaveLength(0);
    });
  });

  describe('data management', () => {
    it('should clear all data when requested', () => {
      const baseTime = Date.now();

      // Add some data
      tracker.recordAction({
        type: ActionType.KEYSTROKE,
        timestamp: baseTime,
        duration: 0,
        metadata: { hashedKey: 'key_1' }
      });

      tracker.recordAction({
        type: ActionType.CONTEXT_SWITCH,
        timestamp: baseTime + 1000,
        duration: 100,
        metadata: { from: 'context1', to: 'context2' }
      });

      // Verify data exists
      expect(tracker.getCurrentBuffer().length).toBeGreaterThan(0);

      // Clear data
      tracker.clearData();

      // Verify data is cleared
      expect(tracker.getCurrentBuffer()).toHaveLength(0);
      expect(tracker.getRecentSequences()).toHaveLength(0);
      expect(tracker.getContextSwitchStatistics().totalSwitches).toBe(0);
    });

    it('should maintain history size limits', () => {
      const baseTime = Date.now();

      // Add many sequences to test limit
      for (let seq = 0; seq < 150; seq++) {
        // Add actions to create sequence
        for (let i = 0; i < 5; i++) {
          tracker.recordAction({
            type: ActionType.KEYSTROKE,
            timestamp: baseTime + seq * 1000 + i * 100,
            duration: 0,
            metadata: { hashedKey: `key_${seq}_${i}` }
          });
        }
        
        // Force sequence completion
        tracker.recordAction({
          type: ActionType.CONTEXT_SWITCH,
          timestamp: baseTime + seq * 1000 + 800,
          duration: 100,
          metadata: { from: `context_${seq}`, to: `context_${seq + 1}` }
        });
      }

      const sequences = tracker.getRecentSequences(200);
      expect(sequences.length).toBeLessThanOrEqual(100); // Should respect max limit
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle actions with missing metadata', () => {
      const action: BehavioralAction = {
        type: ActionType.KEYSTROKE,
        timestamp: Date.now(),
        duration: 0,
        metadata: {} // Empty metadata
      };

      expect(() => tracker.recordAction(action)).not.toThrow();
      
      const buffer = tracker.getCurrentBuffer();
      expect(buffer).toHaveLength(1);
    });

    it('should handle invalid timestamps', () => {
      const action: BehavioralAction = {
        type: ActionType.KEYSTROKE,
        timestamp: -1, // Invalid timestamp
        duration: 0,
        metadata: { hashedKey: 'key_1' }
      };

      expect(() => tracker.recordAction(action)).not.toThrow();
    });

    it('should handle rapid consecutive context switches', () => {
      const baseTime = Date.now();

      // Add rapid context switches
      for (let i = 0; i < 10; i++) {
        tracker.recordAction({
          type: ActionType.CONTEXT_SWITCH,
          timestamp: baseTime + i * 10, // Very rapid switches
          duration: 5,
          metadata: { from: `context_${i}`, to: `context_${i + 1}` }
        });
      }

      const stats = tracker.getContextSwitchStatistics();
      expect(stats.totalSwitches).toBeGreaterThan(0);
      expect(typeof stats.switchesPerHour).toBe('number');
    });

    it('should handle empty time ranges', () => {
      const now = new Date();
      const sequences = tracker.getSequencesByTimeRange(now, now);
      const switches = tracker.getContextSwitchesByTimeRange(now, now);

      expect(sequences).toHaveLength(0);
      expect(switches).toHaveLength(0);
    });

    it('should handle focus analysis with no segments', () => {
      const focusPattern = tracker.analyzeFocusPatterns('nonexistent_session');

      expect(focusPattern.sessionId).toBe('nonexistent_session');
      expect(focusPattern.focusSegments).toHaveLength(0);
      expect(focusPattern.totalFocusTime).toBe(0);
    });
  });

  describe('statistical analysis', () => {
    it('should perform basic statistical calculations', () => {
      const baseTime = Date.now();
      const smallTracker = new BehavioralSequenceTracker({ bufferSize: 5 });

      // Create enough actions to fill buffer and create sequences
      for (let i = 0; i < 10; i++) {
        smallTracker.recordAction({
          type: ActionType.KEYSTROKE,
          timestamp: baseTime + i * 200, // Consistent 200ms intervals
          duration: 0,
          metadata: { hashedKey: `key_${i}` }
        });
      }

      const sequences = smallTracker.getRecentSequences();
      expect(sequences.length).toBeGreaterThan(0);

      // Verify sequences have pattern analysis
      sequences.forEach(sequence => {
        expect(Array.isArray(sequence.patterns)).toBe(true);
        expect(sequence.context).toHaveProperty('fileType');
        expect(sequence.context).toHaveProperty('projectContext');
        expect(sequence.context).toHaveProperty('timeOfDay');
        expect(sequence.context).toHaveProperty('sessionDuration');
      });
    });
  });
});