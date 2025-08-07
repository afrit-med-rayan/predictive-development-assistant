import { BehavioralAction, BehavioralPattern, ActionType, ContextSnapshot } from '../interfaces/behavioral';

/**
 * Behavioral sequence tracking system
 * Implements requirements 3.2 and 3.4
 */

export interface SequenceConfig {
  bufferSize: number;
  contextSwitchThreshold: number; // ms
  focusLossThreshold: number; // ms
  patternChangeThreshold: number; // statistical threshold
}

export interface ActionSequence {
  id: string;
  actions: BehavioralAction[];
  startTime: Date;
  endTime: Date;
  context: ContextSnapshot;
  patterns: string[];
}

export interface ContextSwitch {
  timestamp: Date;
  fromContext: string;
  toContext: string;
  duration: number;
  reason: 'file_switch' | 'application_switch' | 'focus_loss' | 'manual';
}

export interface FocusPattern {
  sessionId: string;
  focusSegments: FocusSegment[];
  totalFocusTime: number;
  averageFocusSegment: number;
  interruptionCount: number;
}

export interface FocusSegment {
  startTime: Date;
  endTime: Date;
  duration: number;
  context: string;
  activityLevel: number;
}

export interface PatternChangeEvent {
  timestamp: Date;
  previousPattern: string;
  newPattern: string;
  confidence: number;
  changeType: 'gradual' | 'sudden' | 'cyclical';
  statisticalSignificance: number;
}

/**
 * System for tracking behavioral sequences and detecting patterns
 */
export class BehavioralSequenceTracker {
  private config: SequenceConfig;
  private actionBuffer: BehavioralAction[] = [];
  private sequences: ActionSequence[] = [];
  private contextSwitches: ContextSwitch[] = [];
  private currentContext: string = '';
  private lastActivityTime: Date = new Date();
  private focusSegments: FocusSegment[] = [];
  private currentFocusSegment: FocusSegment | null = null;
  private patternHistory: Map<string, number[]> = new Map();
  private readonly maxSequences: number = 100;
  private readonly maxContextSwitches: number = 500;
  private sequenceIdCounter: number = 0;

  constructor(config: Partial<SequenceConfig> = {}) {
    this.config = {
      bufferSize: config.bufferSize || 50,
      contextSwitchThreshold: config.contextSwitchThreshold || 2000, // 2 seconds
      focusLossThreshold: config.focusLossThreshold || 30000, // 30 seconds
      patternChangeThreshold: config.patternChangeThreshold || 0.05 // 5% significance level
    };
  }

  /**
   * Records an action in the sequence buffer
   */
  recordAction(action: BehavioralAction): void {
    this.actionBuffer.push(action);
    this.lastActivityTime = new Date(action.timestamp);

    // Maintain buffer size
    if (this.actionBuffer.length > this.config.bufferSize) {
      this.actionBuffer.shift();
    }

    // Detect context switches
    this.detectContextSwitch(action);

    // Update focus tracking
    this.updateFocusTracking(action);

    // Check for sequence completion
    this.checkSequenceCompletion();
  }

  /**
   * Detects context switching patterns
   */
  detectContextSwitch(action: BehavioralAction): void {
    let newContext = '';

    // Determine context based on action type and metadata
    switch (action.type) {
      case ActionType.FILE_SWITCH:
        newContext = action.metadata.fileName || 'unknown_file';
        break;
      case ActionType.CONTEXT_SWITCH:
        newContext = action.metadata.to || 'unknown_context';
        break;
      case ActionType.KEYSTROKE:
      case ActionType.CODE_EDIT:
        // Context remains the same for these actions
        return;
      default:
        newContext = action.metadata.context || 'default_context';
    }

    // Initialize context if this is the first action
    if (this.currentContext === '') {
      this.currentContext = newContext;
      this.startNewFocusSegment(action.timestamp, newContext);
      return;
    }

    // Check if context actually changed
    if (newContext !== this.currentContext) {
      const contextSwitch: ContextSwitch = {
        timestamp: new Date(action.timestamp),
        fromContext: this.currentContext,
        toContext: newContext,
        duration: action.duration,
        reason: this.determineContextSwitchReason(action)
      };

      this.contextSwitches.push(contextSwitch);

      // Maintain context switch history size
      if (this.contextSwitches.length > this.maxContextSwitches) {
        this.contextSwitches.shift();
      }

      // End current focus segment
      this.endCurrentFocusSegment(action.timestamp);

      // Update current context
      this.currentContext = newContext;
      
      // Start new focus segment
      this.startNewFocusSegment(action.timestamp, newContext);
    }
  }

  /**
   * Analyzes focus patterns from recorded data
   */
  analyzeFocusPatterns(sessionId: string): FocusPattern {
    const sessionSegments = this.focusSegments.filter(
      segment => segment.context.includes(sessionId) || sessionId === 'all'
    );

    if (sessionSegments.length === 0) {
      return this.getDefaultFocusPattern(sessionId);
    }

    const totalFocusTime = sessionSegments.reduce((sum, segment) => sum + segment.duration, 0);
    const averageFocusSegment = totalFocusTime / sessionSegments.length;
    const interruptionCount = this.countInterruptions(sessionSegments);

    return {
      sessionId,
      focusSegments: sessionSegments,
      totalFocusTime,
      averageFocusSegment,
      interruptionCount
    };
  }

  /**
   * Detects behavioral pattern changes using statistical methods
   */
  detectPatternChanges(): PatternChangeEvent[] {
    const changes: PatternChangeEvent[] = [];
    const recentSequences = this.sequences.slice(-10); // Analyze last 10 sequences

    if (recentSequences.length < 5) {
      return changes; // Need sufficient data
    }

    // Analyze different pattern types
    const patternTypes = ['typing_rhythm', 'context_switching', 'focus_duration'];

    for (const patternType of patternTypes) {
      const change = this.detectPatternChange(patternType, recentSequences);
      if (change) {
        changes.push(change);
      }
    }

    return changes;
  }

  /**
   * Gets action sequences within a time range
   */
  getSequencesByTimeRange(startTime: Date, endTime: Date): ActionSequence[] {
    return this.sequences.filter(sequence => 
      sequence.startTime >= startTime && sequence.endTime <= endTime
    );
  }

  /**
   * Gets context switches within a time range
   */
  getContextSwitchesByTimeRange(startTime: Date, endTime: Date): ContextSwitch[] {
    return this.contextSwitches.filter(contextSwitch =>
      contextSwitch.timestamp >= startTime && contextSwitch.timestamp <= endTime
    );
  }

  /**
   * Gets current action buffer
   */
  getCurrentBuffer(): BehavioralAction[] {
    return [...this.actionBuffer];
  }

  /**
   * Gets recent sequences
   */
  getRecentSequences(count: number = 10): ActionSequence[] {
    return this.sequences.slice(-count);
  }

  /**
   * Gets context switch statistics
   */
  getContextSwitchStatistics(): {
    totalSwitches: number;
    averageSwitchDuration: number;
    mostFrequentReason: string;
    switchesPerHour: number;
    contexts: string[];
  } {
    if (this.contextSwitches.length === 0) {
      return {
        totalSwitches: 0,
        averageSwitchDuration: 0,
        mostFrequentReason: 'none',
        switchesPerHour: 0,
        contexts: []
      };
    }

    const totalSwitches = this.contextSwitches.length;
    const averageSwitchDuration = this.contextSwitches.reduce(
      (sum, cs) => sum + cs.duration, 0
    ) / totalSwitches;

    const reasonCounts = new Map<string, number>();
    const contexts = new Set<string>();

    this.contextSwitches.forEach(cs => {
      reasonCounts.set(cs.reason, (reasonCounts.get(cs.reason) || 0) + 1);
      contexts.add(cs.fromContext);
      contexts.add(cs.toContext);
    });

    const mostFrequentReason = Array.from(reasonCounts.entries())
      .reduce((max, [reason, count]) => count > max[1] ? [reason, count] : max, ['none', 0])[0];

    // Calculate switches per hour
    const timeSpan = this.contextSwitches.length > 1 ?
      this.contextSwitches[this.contextSwitches.length - 1].timestamp.getTime() -
      this.contextSwitches[0].timestamp.getTime() : 0;
    const hours = timeSpan / (1000 * 60 * 60);
    const switchesPerHour = hours > 0 ? totalSwitches / hours : 0;

    return {
      totalSwitches,
      averageSwitchDuration,
      mostFrequentReason,
      switchesPerHour,
      contexts: Array.from(contexts)
    };
  }

  /**
   * Clears all tracking data
   */
  clearData(): void {
    this.actionBuffer = [];
    this.sequences = [];
    this.contextSwitches = [];
    this.focusSegments = [];
    this.currentFocusSegment = null;
    this.patternHistory.clear();
    this.currentContext = '';
    this.lastActivityTime = new Date();
    this.sequenceIdCounter = 0;
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<SequenceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current configuration
   */
  getConfig(): SequenceConfig {
    return { ...this.config };
  }

  private determineContextSwitchReason(action: BehavioralAction): ContextSwitch['reason'] {
    switch (action.type) {
      case ActionType.FILE_SWITCH:
        return 'file_switch';
      case ActionType.CONTEXT_SWITCH:
        return action.metadata.reason || 'manual';
      default:
        // Check if it's been a while since last activity (focus loss)
        const timeSinceLastActivity = action.timestamp - this.lastActivityTime.getTime();
        return timeSinceLastActivity > this.config.focusLossThreshold ? 'focus_loss' : 'manual';
    }
  }

  private updateFocusTracking(action: BehavioralAction): void {
    const now = new Date(action.timestamp);
    
    if (this.currentFocusSegment) {
      // Update current segment
      this.currentFocusSegment.endTime = now;
      this.currentFocusSegment.duration = now.getTime() - this.currentFocusSegment.startTime.getTime();
      this.currentFocusSegment.activityLevel = this.calculateActivityLevel();

      // Check for focus loss
      const timeSinceLastActivity = now.getTime() - this.lastActivityTime.getTime();
      if (timeSinceLastActivity > this.config.focusLossThreshold) {
        this.endCurrentFocusSegment(action.timestamp);
      }
    }
  }

  private startNewFocusSegment(timestamp: number, context: string): void {
    this.currentFocusSegment = {
      startTime: new Date(timestamp),
      endTime: new Date(timestamp),
      duration: 0,
      context,
      activityLevel: 0
    };
  }

  private endCurrentFocusSegment(timestamp: number): void {
    if (this.currentFocusSegment) {
      this.currentFocusSegment.endTime = new Date(timestamp);
      this.currentFocusSegment.duration = timestamp - this.currentFocusSegment.startTime.getTime();
      
      this.focusSegments.push(this.currentFocusSegment);
      this.currentFocusSegment = null;
    }
  }

  private calculateActivityLevel(): number {
    // Calculate activity level based on recent actions in buffer
    const recentActions = this.actionBuffer.slice(-10);
    const timeSpan = recentActions.length > 1 ?
      recentActions[recentActions.length - 1].timestamp - recentActions[0].timestamp : 1;
    
    return timeSpan > 0 ? recentActions.length / (timeSpan / 1000) : 0; // Actions per second
  }

  private checkSequenceCompletion(): void {
    // Complete sequence when buffer is full
    if (this.actionBuffer.length >= this.config.bufferSize) {
      this.completeCurrentSequence();
    }
  }

  private completeCurrentSequence(): void {
    if (this.actionBuffer.length === 0) return;

    const sequence: ActionSequence = {
      id: `seq_${++this.sequenceIdCounter}`,
      actions: [...this.actionBuffer],
      startTime: new Date(this.actionBuffer[0].timestamp),
      endTime: new Date(this.actionBuffer[this.actionBuffer.length - 1].timestamp),
      context: this.createContextSnapshot(),
      patterns: this.extractSequencePatterns(this.actionBuffer)
    };

    this.sequences.push(sequence);

    // Maintain sequence history size
    if (this.sequences.length > this.maxSequences) {
      this.sequences.shift();
    }

    // Clear buffer for next sequence
    this.actionBuffer = [];
  }

  private createContextSnapshot(): ContextSnapshot {
    return {
      fileType: this.currentContext.split('.').pop() || 'unknown',
      projectContext: this.currentContext,
      timeOfDay: new Date().getHours(),
      sessionDuration: Date.now() - (this.focusSegments[0]?.startTime.getTime() || Date.now())
    };
  }

  private extractSequencePatterns(actions: BehavioralAction[]): string[] {
    const patterns: string[] = [];

    // Analyze action type patterns
    const actionTypes = actions.map(a => a.type);
    const typePattern = this.findActionTypePattern(actionTypes);
    if (typePattern) patterns.push(typePattern);

    // Analyze timing patterns
    const timingPattern = this.findTimingPattern(actions);
    if (timingPattern) patterns.push(timingPattern);

    // Analyze context patterns
    const contextPattern = this.findContextPattern(actions);
    if (contextPattern) patterns.push(contextPattern);

    return patterns;
  }

  private findActionTypePattern(actionTypes: ActionType[]): string | null {
    // Simple pattern detection - could be enhanced with more sophisticated algorithms
    const typeSequence = actionTypes.join(',');
    
    if (typeSequence.includes('keystroke,keystroke,keystroke')) {
      return 'continuous_typing';
    }
    if (typeSequence.includes('context_switch,keystroke')) {
      return 'switch_and_type';
    }
    if (typeSequence.includes('file_switch,code_edit')) {
      return 'file_navigation';
    }
    
    return null;
  }

  private findTimingPattern(actions: BehavioralAction[]): string | null {
    if (actions.length < 3) return null;

    const intervals = [];
    for (let i = 1; i < actions.length; i++) {
      intervals.push(actions[i].timestamp - actions[i - 1].timestamp);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
    if (avgInterval < 200) return 'rapid_sequence';
    if (avgInterval > 2000) return 'deliberate_sequence';
    return 'normal_sequence';
  }

  private findContextPattern(actions: BehavioralAction[]): string | null {
    const contexts = actions
      .filter(a => a.metadata.context)
      .map(a => a.metadata.context);
    
    const uniqueContexts = new Set(contexts);
    
    if (uniqueContexts.size === 1) return 'single_context';
    if (uniqueContexts.size > actions.length / 2) return 'context_heavy';
    return 'mixed_context';
  }

  private detectPatternChange(patternType: string, sequences: ActionSequence[]): PatternChangeEvent | null {
    // Extract pattern metrics for statistical analysis
    const metrics = sequences.map(seq => this.extractPatternMetric(seq, patternType));
    
    if (metrics.length < 5) return null;

    // Split into two groups for comparison
    const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
    const secondHalf = metrics.slice(Math.floor(metrics.length / 2));

    // Perform statistical test (simplified t-test)
    const tStat = this.performTTest(firstHalf, secondHalf);
    const pValue = this.calculatePValue(tStat, metrics.length - 2);

    if (pValue < this.config.patternChangeThreshold) {
      return {
        timestamp: new Date(),
        previousPattern: `${patternType}_old`,
        newPattern: `${patternType}_new`,
        confidence: 1 - pValue,
        changeType: this.determineChangeType(firstHalf, secondHalf),
        statisticalSignificance: pValue
      };
    }

    return null;
  }

  private extractPatternMetric(sequence: ActionSequence, patternType: string): number {
    switch (patternType) {
      case 'typing_rhythm':
        return this.calculateTypingRhythm(sequence);
      case 'context_switching':
        return this.calculateContextSwitchingRate(sequence);
      case 'focus_duration':
        return sequence.endTime.getTime() - sequence.startTime.getTime();
      default:
        return 0;
    }
  }

  private calculateTypingRhythm(sequence: ActionSequence): number {
    const keystrokeActions = sequence.actions.filter(a => a.type === ActionType.KEYSTROKE);
    if (keystrokeActions.length < 2) return 0;

    const intervals = [];
    for (let i = 1; i < keystrokeActions.length; i++) {
      intervals.push(keystrokeActions[i].timestamp - keystrokeActions[i - 1].timestamp);
    }

    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  private calculateContextSwitchingRate(sequence: ActionSequence): number {
    const contextSwitches = sequence.actions.filter(a => a.type === ActionType.CONTEXT_SWITCH);
    const duration = sequence.endTime.getTime() - sequence.startTime.getTime();
    
    return duration > 0 ? (contextSwitches.length / duration) * 60000 : 0; // Switches per minute
  }

  private performTTest(group1: number[], group2: number[]): number {
    const mean1 = group1.reduce((sum, val) => sum + val, 0) / group1.length;
    const mean2 = group2.reduce((sum, val) => sum + val, 0) / group2.length;
    
    const var1 = group1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (group1.length - 1);
    const var2 = group2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (group2.length - 1);
    
    const pooledVar = ((group1.length - 1) * var1 + (group2.length - 1) * var2) / 
                     (group1.length + group2.length - 2);
    
    const standardError = Math.sqrt(pooledVar * (1/group1.length + 1/group2.length));
    
    return standardError > 0 ? (mean1 - mean2) / standardError : 0;
  }

  private calculatePValue(tStat: number, degreesOfFreedom: number): number {
    // Simplified p-value calculation (would use proper statistical library in production)
    const absTStat = Math.abs(tStat);
    
    if (absTStat > 2.576) return 0.01;  // 99% confidence
    if (absTStat > 1.96) return 0.05;   // 95% confidence
    if (absTStat > 1.645) return 0.10;  // 90% confidence
    
    return 0.5; // Not significant
  }

  private determineChangeType(firstHalf: number[], secondHalf: number[]): PatternChangeEvent['changeType'] {
    const mean1 = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const mean2 = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const percentChange = Math.abs((mean2 - mean1) / mean1);
    
    if (percentChange > 0.5) return 'sudden';
    if (percentChange > 0.2) return 'gradual';
    return 'cyclical';
  }

  private countInterruptions(segments: FocusSegment[]): number {
    // Count segments shorter than average as interruptions
    if (segments.length === 0) return 0;
    
    const averageDuration = segments.reduce((sum, seg) => sum + seg.duration, 0) / segments.length;
    return segments.filter(seg => seg.duration < averageDuration / 2).length;
  }

  private getDefaultFocusPattern(sessionId: string): FocusPattern {
    return {
      sessionId,
      focusSegments: [],
      totalFocusTime: 0,
      averageFocusSegment: 0,
      interruptionCount: 0
    };
  }
}