import { BehavioralAction, BehavioralMetrics, ActionType } from '../interfaces/behavioral';
import { KeystrokeTimingAnalyzer, KeystrokeMetrics } from './keystroke-analyzer';

/**
 * Behavioral metrics calculation engine
 * Implements requirements 3.1, 3.2, and 1.5
 */

export interface TemporalMetrics {
  timestamp: Date;
  metrics: BehavioralMetrics;
  sessionId: string;
  duration: number;
}

export interface FatigueIndicators {
  typingSpeedDecline: number;
  increasedPauseFrequency: number;
  rhythmInconsistency: number;
  overallFatigueScore: number;
}

export interface PatternStorage {
  userId: string;
  patterns: Map<string, TemporalMetrics[]>;
  currentSession: string;
  sessionStartTime: Date;
}

/**
 * Engine for calculating behavioral metrics and detecting patterns
 */
export class BehavioralMetricsEngine {
  private keystrokeAnalyzer: KeystrokeTimingAnalyzer;
  private patternStorage: PatternStorage;
  private metricsHistory: TemporalMetrics[] = [];
  private readonly maxHistorySize: number = 1000;
  private readonly sessionTimeoutMs: number = 30 * 60 * 1000; // 30 minutes
  private readonly fatigueWindowSize: number = 10; // Number of metrics to analyze for fatigue

  constructor(userId: string) {
    this.keystrokeAnalyzer = new KeystrokeTimingAnalyzer();
    this.patternStorage = {
      userId,
      patterns: new Map(),
      currentSession: this.generateSessionId(),
      sessionStartTime: new Date()
    };
  }

  /**
   * Calculates comprehensive behavioral metrics
   */
  calculateMetrics(actions: BehavioralAction[]): BehavioralMetrics {
    const keystrokeActions = actions.filter(action => action.type === ActionType.KEYSTROKE);
    const contextSwitches = this.countContextSwitches(actions);
    
    // Process keystrokes for timing analysis
    keystrokeActions.forEach(action => {
      if (action.metadata.hashedKey) {
        this.keystrokeAnalyzer.processKeystroke({
          key: action.metadata.hashedKey,
          timestamp: action.timestamp,
          type: action.metadata.eventType || 'keydown',
          ctrlKey: action.metadata.modifiers?.ctrl || false,
          shiftKey: action.metadata.modifiers?.shift || false,
          altKey: action.metadata.modifiers?.alt || false
        });
      }
    });

    const keystrokeMetrics = this.keystrokeAnalyzer.analyzeStatistics();
    const fatigueLevel = this.calculateFatigueLevel(keystrokeMetrics);

    const metrics: BehavioralMetrics = {
      typingSpeed: keystrokeMetrics.typingSpeed,
      pausePatterns: keystrokeMetrics.pausePatterns,
      decisionTime: keystrokeMetrics.decisionTime,
      contextSwitches,
      fatigueLevel
    };

    // Store metrics with temporal indexing
    this.storeMetrics(metrics);

    return metrics;
  }

  /**
   * Detects fatigue using typing rhythm analysis
   */
  detectFatigue(): FatigueIndicators {
    if (this.metricsHistory.length < this.fatigueWindowSize) {
      return this.getDefaultFatigueIndicators();
    }

    const recentMetrics = this.metricsHistory.slice(-this.fatigueWindowSize);
    const earlierMetrics = this.metricsHistory.slice(
      Math.max(0, this.metricsHistory.length - this.fatigueWindowSize * 2),
      -this.fatigueWindowSize
    );

    if (earlierMetrics.length === 0) {
      return this.getDefaultFatigueIndicators();
    }

    const recentAvgSpeed = this.calculateAverageTypingSpeed(recentMetrics);
    const earlierAvgSpeed = this.calculateAverageTypingSpeed(earlierMetrics);
    
    const recentAvgPauses = this.calculateAveragePauseFrequency(recentMetrics);
    const earlierAvgPauses = this.calculateAveragePauseFrequency(earlierMetrics);

    const recentRhythmConsistency = this.calculateAverageRhythmConsistency(recentMetrics);
    const earlierRhythmConsistency = this.calculateAverageRhythmConsistency(earlierMetrics);

    const typingSpeedDecline = earlierAvgSpeed > 0 ? 
      Math.max(0, (earlierAvgSpeed - recentAvgSpeed) / earlierAvgSpeed) : 0;
    
    const increasedPauseFrequency = earlierAvgPauses > 0 ? 
      Math.max(0, (recentAvgPauses - earlierAvgPauses) / earlierAvgPauses) : 0;
    
    const rhythmInconsistency = earlierRhythmConsistency > 0 ? 
      Math.max(0, (earlierRhythmConsistency - recentRhythmConsistency) / earlierRhythmConsistency) : 0;

    const overallFatigueScore = (typingSpeedDecline + increasedPauseFrequency + rhythmInconsistency) / 3;

    return {
      typingSpeedDecline,
      increasedPauseFrequency,
      rhythmInconsistency,
      overallFatigueScore
    };
  }

  /**
   * Stores behavioral patterns with temporal indexing
   */
  storePattern(pattern: string, metrics: BehavioralMetrics): void {
    const temporalMetrics: TemporalMetrics = {
      timestamp: new Date(),
      metrics,
      sessionId: this.patternStorage.currentSession,
      duration: this.getSessionDuration()
    };

    if (!this.patternStorage.patterns.has(pattern)) {
      this.patternStorage.patterns.set(pattern, []);
    }

    const patternHistory = this.patternStorage.patterns.get(pattern)!;
    patternHistory.push(temporalMetrics);

    // Maintain storage size limits
    if (patternHistory.length > this.maxHistorySize) {
      patternHistory.shift();
    }
  }

  /**
   * Retrieves patterns within a time range
   */
  getPatternsByTimeRange(pattern: string, startTime: Date, endTime: Date): TemporalMetrics[] {
    const patternHistory = this.patternStorage.patterns.get(pattern) || [];
    
    return patternHistory.filter(metrics => 
      metrics.timestamp >= startTime && metrics.timestamp <= endTime
    );
  }

  /**
   * Gets patterns for the current session
   */
  getCurrentSessionPatterns(): Map<string, TemporalMetrics[]> {
    const sessionPatterns = new Map<string, TemporalMetrics[]>();
    
    for (const [pattern, history] of this.patternStorage.patterns.entries()) {
      const sessionMetrics = history.filter(
        metrics => metrics.sessionId === this.patternStorage.currentSession
      );
      
      if (sessionMetrics.length > 0) {
        sessionPatterns.set(pattern, sessionMetrics);
      }
    }
    
    return sessionPatterns;
  }

  /**
   * Starts a new session
   */
  startNewSession(): void {
    this.patternStorage.currentSession = this.generateSessionId();
    this.patternStorage.sessionStartTime = new Date();
    this.keystrokeAnalyzer.clearData();
  }

  /**
   * Gets comprehensive metrics history
   */
  getMetricsHistory(limit?: number): TemporalMetrics[] {
    if (limit) {
      return this.metricsHistory.slice(-limit);
    }
    return [...this.metricsHistory];
  }

  /**
   * Clears all stored data for privacy
   */
  clearAllData(): void {
    this.metricsHistory = [];
    this.patternStorage.patterns.clear();
    this.keystrokeAnalyzer.clearData();
    this.startNewSession();
  }

  /**
   * Gets current session statistics
   */
  getSessionStatistics(): {
    sessionId: string;
    duration: number;
    metricsCount: number;
    averageTypingSpeed: number;
    totalContextSwitches: number;
    fatigueProgression: number;
  } {
    const sessionMetrics = this.metricsHistory.filter(
      m => m.sessionId === this.patternStorage.currentSession
    );

    const averageTypingSpeed = sessionMetrics.length > 0 ?
      sessionMetrics.reduce((sum, m) => sum + m.metrics.typingSpeed, 0) / sessionMetrics.length : 0;

    const totalContextSwitches = sessionMetrics.reduce(
      (sum, m) => sum + m.metrics.contextSwitches, 0
    );

    const fatigueProgression = this.calculateFatigueProgression(sessionMetrics);

    return {
      sessionId: this.patternStorage.currentSession,
      duration: this.getSessionDuration(),
      metricsCount: sessionMetrics.length,
      averageTypingSpeed,
      totalContextSwitches,
      fatigueProgression
    };
  }

  private storeMetrics(metrics: BehavioralMetrics): void {
    const temporalMetrics: TemporalMetrics = {
      timestamp: new Date(),
      metrics,
      sessionId: this.patternStorage.currentSession,
      duration: this.getSessionDuration()
    };

    this.metricsHistory.push(temporalMetrics);

    // Maintain history size
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    // Check for session timeout
    if (this.getSessionDuration() > this.sessionTimeoutMs) {
      this.startNewSession();
    }
  }

  private countContextSwitches(actions: BehavioralAction[]): number {
    return actions.filter(action => action.type === ActionType.CONTEXT_SWITCH).length;
  }

  private calculateFatigueLevel(keystrokeMetrics: KeystrokeMetrics): number {
    // Combine multiple fatigue indicators
    const fatigueIndicators = this.detectFatigue();
    return fatigueIndicators.overallFatigueScore;
  }

  private calculateAverageTypingSpeed(metrics: TemporalMetrics[]): number {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.metrics.typingSpeed, 0) / metrics.length;
  }

  private calculateAveragePauseFrequency(metrics: TemporalMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const totalPauses = metrics.reduce((sum, m) => 
      sum + m.metrics.pausePatterns.reduce((pSum, p) => pSum + p, 0), 0
    );
    
    return totalPauses / metrics.length;
  }

  private calculateAverageRhythmConsistency(metrics: TemporalMetrics[]): number {
    // This would typically come from keystroke analyzer
    // For now, we'll estimate based on decision time variance
    if (metrics.length === 0) return 0;
    
    const decisionTimes = metrics.map(m => m.metrics.decisionTime);
    const mean = decisionTimes.reduce((sum, dt) => sum + dt, 0) / decisionTimes.length;
    const variance = decisionTimes.reduce((sum, dt) => sum + Math.pow(dt - mean, 2), 0) / decisionTimes.length;
    const stdDev = Math.sqrt(variance);
    
    return mean > 0 ? 1 - (stdDev / mean) : 0;
  }

  private calculateFatigueProgression(sessionMetrics: TemporalMetrics[]): number {
    if (sessionMetrics.length < 2) return 0;
    
    const firstHalf = sessionMetrics.slice(0, Math.floor(sessionMetrics.length / 2));
    const secondHalf = sessionMetrics.slice(Math.floor(sessionMetrics.length / 2));
    
    const firstHalfAvgSpeed = this.calculateAverageTypingSpeed(firstHalf);
    const secondHalfAvgSpeed = this.calculateAverageTypingSpeed(secondHalf);
    
    return firstHalfAvgSpeed > 0 ? 
      Math.max(0, (firstHalfAvgSpeed - secondHalfAvgSpeed) / firstHalfAvgSpeed) : 0;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionDuration(): number {
    return Date.now() - this.patternStorage.sessionStartTime.getTime();
  }

  private getDefaultFatigueIndicators(): FatigueIndicators {
    return {
      typingSpeedDecline: 0,
      increasedPauseFrequency: 0,
      rhythmInconsistency: 0,
      overallFatigueScore: 0
    };
  }
}