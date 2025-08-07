import { BehavioralAction, ActionType } from '../interfaces/behavioral';

/**
 * Keystroke timing analysis module with privacy-preserving features
 * Implements requirements 3.1 and 6.1
 */

export interface KeystrokeEvent {
  key: string;
  timestamp: number;
  type: 'keydown' | 'keyup';
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export interface TimingPattern {
  averageInterval: number;
  variance: number;
  rhythm: number[];
  pauseCount: number;
  burstCount: number;
}

export interface KeystrokeMetrics {
  typingSpeed: number; // WPM
  pausePatterns: number[];
  decisionTime: number;
  rhythmConsistency: number;
  fatigueIndicators: number;
}

/**
 * Privacy-preserving keystroke analyzer that processes timing patterns
 * without storing actual key content
 */
export class KeystrokeTimingAnalyzer {
  private keyEvents: KeystrokeEvent[] = [];
  private timingBuffer: number[] = [];
  private readonly bufferSize: number = 100;
  private readonly pauseThreshold: number = 1000; // ms
  private readonly burstThreshold: number = 100; // ms

  /**
   * Processes a keystroke event and extracts timing information
   * Uses privacy-preserving hashing for key identification
   */
  processKeystroke(event: KeystrokeEvent): void {
    // Store event with privacy-preserving hash instead of actual key
    const hashedEvent: KeystrokeEvent = {
      ...event,
      key: this.hashKey(event.key) // Privacy-preserving hash
    };

    this.keyEvents.push(hashedEvent);
    
    // Maintain buffer size
    if (this.keyEvents.length > this.bufferSize) {
      this.keyEvents.shift();
    }

    // Update timing buffer for pattern analysis
    if (this.keyEvents.length > 1) {
      const interval = event.timestamp - this.keyEvents[this.keyEvents.length - 2].timestamp;
      this.timingBuffer.push(interval);
      
      if (this.timingBuffer.length > this.bufferSize) {
        this.timingBuffer.shift();
      }
    }
  }

  /**
   * Extracts timing patterns from keystroke data
   */
  extractTimingPatterns(): TimingPattern {
    if (this.timingBuffer.length < 2) {
      return this.getDefaultPattern();
    }

    const intervals = this.timingBuffer;
    const averageInterval = this.calculateMean(intervals);
    const variance = this.calculateVariance(intervals, averageInterval);
    
    return {
      averageInterval,
      variance,
      rhythm: this.calculateRhythm(intervals),
      pauseCount: this.countPauses(intervals),
      burstCount: this.countBursts(intervals)
    };
  }

  /**
   * Performs statistical analysis on timing patterns
   */
  analyzeStatistics(): KeystrokeMetrics {
    const pattern = this.extractTimingPatterns();
    
    return {
      typingSpeed: this.calculateTypingSpeed(),
      pausePatterns: this.analyzePausePatterns(),
      decisionTime: this.calculateDecisionTime(),
      rhythmConsistency: this.calculateRhythmConsistency(pattern),
      fatigueIndicators: this.detectFatigueIndicators(pattern)
    };
  }

  /**
   * Converts keystroke data to behavioral actions
   */
  toBehavioralActions(): BehavioralAction[] {
    return this.keyEvents.map(event => ({
      type: ActionType.KEYSTROKE,
      timestamp: event.timestamp,
      duration: 0, // Keystroke duration is typically negligible
      metadata: {
        hashedKey: event.key,
        modifiers: {
          ctrl: event.ctrlKey,
          shift: event.shiftKey,
          alt: event.altKey
        },
        eventType: event.type
      }
    }));
  }

  /**
   * Clears stored keystroke data for privacy
   */
  clearData(): void {
    this.keyEvents = [];
    this.timingBuffer = [];
  }

  /**
   * Privacy-preserving key hashing
   * Uses simple hash to identify key patterns without storing actual keys
   */
  private hashKey(key: string): string {
    // Simple hash for privacy - doesn't store actual key content
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `key_${Math.abs(hash)}`;
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateVariance(values: number[], mean: number): number {
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return this.calculateMean(squaredDiffs);
  }

  private calculateRhythm(intervals: number[]): number[] {
    // Calculate rhythm as moving average of intervals
    const windowSize = 5;
    const rhythm: number[] = [];
    
    for (let i = 0; i <= intervals.length - windowSize; i++) {
      const window = intervals.slice(i, i + windowSize);
      rhythm.push(this.calculateMean(window));
    }
    
    return rhythm;
  }

  private countPauses(intervals: number[]): number {
    return intervals.filter(interval => interval > this.pauseThreshold).length;
  }

  private countBursts(intervals: number[]): number {
    return intervals.filter(interval => interval < this.burstThreshold).length;
  }

  private calculateTypingSpeed(): number {
    if (this.keyEvents.length < 2) return 0;
    
    const timeSpan = this.keyEvents[this.keyEvents.length - 1].timestamp - this.keyEvents[0].timestamp;
    const minutes = timeSpan / (1000 * 60);
    const keystrokes = this.keyEvents.length;
    
    // Approximate WPM (assuming 5 characters per word)
    return minutes > 0 ? (keystrokes / 5) / minutes : 0;
  }

  private analyzePausePatterns(): number[] {
    const pauses = this.timingBuffer.filter(interval => interval > this.pauseThreshold);
    
    // Group pauses into categories
    const shortPauses = pauses.filter(p => p < 2000).length;
    const mediumPauses = pauses.filter(p => p >= 2000 && p < 5000).length;
    const longPauses = pauses.filter(p => p >= 5000).length;
    
    return [shortPauses, mediumPauses, longPauses];
  }

  private calculateDecisionTime(): number {
    const pauses = this.timingBuffer.filter(interval => interval > this.pauseThreshold);
    return pauses.length > 0 ? this.calculateMean(pauses) : 0;
  }

  private calculateRhythmConsistency(pattern: TimingPattern): number {
    if (pattern.rhythm.length < 2) return 0;
    
    // Calculate coefficient of variation for rhythm consistency
    const mean = this.calculateMean(pattern.rhythm);
    const variance = this.calculateVariance(pattern.rhythm, mean);
    const stdDev = Math.sqrt(variance);
    
    return mean > 0 ? 1 - (stdDev / mean) : 0;
  }

  private detectFatigueIndicators(pattern: TimingPattern): number {
    // Fatigue indicators: increasing intervals, decreasing consistency
    const recentRhythm = pattern.rhythm.slice(-10);
    const earlyRhythm = pattern.rhythm.slice(0, 10);
    
    if (recentRhythm.length === 0 || earlyRhythm.length === 0) return 0;
    
    const recentMean = this.calculateMean(recentRhythm);
    const earlyMean = this.calculateMean(earlyRhythm);
    
    // Higher values indicate more fatigue
    return recentMean > earlyMean ? (recentMean - earlyMean) / earlyMean : 0;
  }

  private getDefaultPattern(): TimingPattern {
    return {
      averageInterval: 0,
      variance: 0,
      rhythm: [],
      pauseCount: 0,
      burstCount: 0
    };
  }
}