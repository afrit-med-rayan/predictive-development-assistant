/**
 * Performance monitoring and optimization
 */

export interface PerformanceMonitor {
  startMonitoring(): void;
  stopMonitoring(): void;
  getCurrentMetrics(): PerformanceMetrics;
  getHistoricalMetrics(timeRange: TimeRange): PerformanceMetrics[];
  setPerformanceThresholds(thresholds: PerformanceThresholds): void;
}

export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  throughput: number;
  timestamp: Date;
}

export interface PerformanceThresholds {
  maxCpuUsage: number;
  maxMemoryUsage: number;
  maxResponseTime: number;
  minThroughput: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}