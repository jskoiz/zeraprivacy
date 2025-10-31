/**
 * monitoring.ts
 * 
 * Purpose: SDK monitoring, error tracking, and performance metrics
 * 
 * This module provides comprehensive monitoring capabilities including:
 * - Error tracking and reporting (Sentry-compatible)
 * - Performance metrics collection
 * - Health checks and alerting
 * - Custom event logging
 * 
 * All monitoring is privacy-respecting and can be disabled/configured.
 */

import { GhostSolError } from './errors';

/**
 * Monitoring configuration options
 */
export interface MonitoringConfig {
  /** Enable error tracking */
  enabled: boolean;
  /** Sentry DSN for error reporting (optional) */
  sentryDsn?: string;
  /** Environment name (development, staging, production) */
  environment?: string;
  /** Application version */
  version?: string;
  /** Sample rate for performance monitoring (0-1) */
  performanceSampleRate?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom error handler */
  onError?: (error: ErrorEvent) => void;
  /** Custom performance metric handler */
  onPerformanceMetric?: (metric: PerformanceMetric) => void;
  /** Alert thresholds */
  alertThresholds?: AlertThresholds;
}

/**
 * Alert threshold configuration
 */
export interface AlertThresholds {
  /** Maximum acceptable error rate (errors per minute) */
  maxErrorRate?: number;
  /** Maximum acceptable latency (milliseconds) */
  maxLatency?: number;
  /** Maximum acceptable failure rate (0-1) */
  maxFailureRate?: number;
}

/**
 * Error event for tracking
 */
export interface ErrorEvent {
  /** Error type/category */
  type: string;
  /** Error message */
  message: string;
  /** Error stack trace */
  stack?: string;
  /** Operation context */
  operation?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Timestamp */
  timestamp: number;
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** User context (anonymized) */
  userContext?: {
    userId?: string;
    sessionId?: string;
  };
}

/**
 * Performance metric data
 */
export interface PerformanceMetric {
  /** Operation name */
  operation: string;
  /** Duration in milliseconds */
  duration: number;
  /** Success status */
  success: boolean;
  /** Timestamp */
  timestamp: number;
  /** Additional tags */
  tags?: Record<string, string>;
  /** Custom data */
  data?: Record<string, any>;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  /** Overall health status */
  healthy: boolean;
  /** Individual check results */
  checks: {
    rpc?: {
      healthy: boolean;
      latency?: number;
      error?: string;
    };
    compression?: {
      healthy: boolean;
      available: boolean;
      error?: string;
    };
    balance?: {
      healthy: boolean;
      cached: boolean;
      error?: string;
    };
  };
  /** Timestamp of check */
  timestamp: number;
}

/**
 * Monitoring statistics
 */
export interface MonitoringStats {
  /** Total errors tracked */
  totalErrors: number;
  /** Errors by type */
  errorsByType: Record<string, number>;
  /** Total operations tracked */
  totalOperations: number;
  /** Average operation latency */
  averageLatency: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Last health check */
  lastHealthCheck?: HealthCheckResult;
  /** Alert history */
  alerts: Alert[];
}

/**
 * Alert data
 */
export interface Alert {
  /** Alert type */
  type: 'error_rate' | 'latency' | 'failure_rate' | 'custom';
  /** Alert message */
  message: string;
  /** Severity level */
  severity: 'warning' | 'critical';
  /** Timestamp */
  timestamp: number;
  /** Additional data */
  data?: any;
}

/**
 * SDK Monitor class for tracking errors and performance
 */
export class SdkMonitor {
  private config: MonitoringConfig;
  private errors: ErrorEvent[] = [];
  private metrics: PerformanceMetric[] = [];
  private alerts: Alert[] = [];
  private sentryInitialized: boolean = false;
  
  // Stats tracking
  private errorCounts: Record<string, number> = {};
  private operationTimings: number[] = [];
  private successCount: number = 0;
  private failureCount: number = 0;
  
  // Rate limiting for alerts
  private lastAlertTime: Record<string, number> = {};
  private readonly ALERT_COOLDOWN = 60000; // 1 minute

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      enabled: true,
      environment: 'production',
      performanceSampleRate: 0.1,
      debug: false,
      ...config,
    };

    // Initialize Sentry if DSN provided
    if (this.config.enabled && this.config.sentryDsn) {
      this.initializeSentry();
    }

    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  /**
   * Initialize Sentry SDK for error tracking
   */
  private initializeSentry(): void {
    try {
      // Check if Sentry is available (optional dependency)
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        const Sentry = (window as any).Sentry;
        Sentry.init({
          dsn: this.config.sentryDsn,
          environment: this.config.environment,
          release: this.config.version,
          tracesSampleRate: this.config.performanceSampleRate || 0.1,
          beforeSend: (event: any, hint: any) => {
            // Allow custom filtering
            return event;
          },
        });
        this.sentryInitialized = true;
        this.log('Sentry initialized successfully');
      }
    } catch (error) {
      console.warn('[Monitor] Failed to initialize Sentry:', error);
    }
  }

  /**
   * Track an error
   */
  trackError(error: Error | GhostSolError, context?: {
    operation?: string;
    metadata?: Record<string, any>;
    severity?: ErrorEvent['severity'];
  }): void {
    if (!this.config.enabled) return;

    const errorEvent: ErrorEvent = {
      type: error.name || 'Error',
      message: error.message,
      stack: error.stack,
      operation: context?.operation,
      metadata: context?.metadata,
      timestamp: Date.now(),
      severity: context?.severity || 'medium',
    };

    // Store error
    this.errors.push(errorEvent);
    
    // Update counts
    this.errorCounts[errorEvent.type] = (this.errorCounts[errorEvent.type] || 0) + 1;

    // Send to Sentry if available
    if (this.sentryInitialized && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          operation: { name: context?.operation },
          metadata: context?.metadata,
        },
        level: this.mapSeverityToSentryLevel(errorEvent.severity),
      });
    }

    // Call custom error handler
    if (this.config.onError) {
      try {
        this.config.onError(errorEvent);
      } catch (handlerError) {
        this.log('Error in custom error handler:', handlerError);
      }
    }

    // Check alert thresholds
    this.checkAlertThresholds();

    this.log('Error tracked:', errorEvent);
  }

  /**
   * Track a performance metric
   */
  trackMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    if (!this.config.enabled) return;

    // Sample based on configuration
    if (Math.random() > (this.config.performanceSampleRate || 0.1)) {
      return;
    }

    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    // Store metric
    this.metrics.push(fullMetric);
    
    // Update stats
    this.operationTimings.push(fullMetric.duration);
    if (fullMetric.success) {
      this.successCount++;
    } else {
      this.failureCount++;
    }

    // Send to Sentry if available
    if (this.sentryInitialized && (window as any).Sentry) {
      (window as any).Sentry.addBreadcrumb({
        category: 'performance',
        message: `${metric.operation}: ${metric.duration}ms`,
        level: 'info',
        data: metric.data,
      });
    }

    // Call custom performance handler
    if (this.config.onPerformanceMetric) {
      try {
        this.config.onPerformanceMetric(fullMetric);
      } catch (handlerError) {
        this.log('Error in custom performance handler:', handlerError);
      }
    }

    this.log('Metric tracked:', fullMetric);
  }

  /**
   * Start timing an operation
   */
  startTimer(operation: string): (success?: boolean, metadata?: Record<string, any>) => void {
    const startTime = performance.now();
    
    return (success: boolean = true, metadata?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      this.trackMetric({
        operation,
        duration,
        success,
        data: metadata,
      });
    };
  }

  /**
   * Perform health check
   */
  async performHealthCheck(
    rpcCheck?: () => Promise<boolean>,
    compressionCheck?: () => Promise<boolean>,
    balanceCheck?: () => Promise<boolean>
  ): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      healthy: true,
      checks: {},
      timestamp: Date.now(),
    };

    // RPC health check
    if (rpcCheck) {
      try {
        const startTime = performance.now();
        const healthy = await rpcCheck();
        const latency = performance.now() - startTime;
        result.checks.rpc = { healthy, latency };
        if (!healthy) result.healthy = false;
      } catch (error) {
        result.checks.rpc = {
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        result.healthy = false;
      }
    }

    // Compression health check
    if (compressionCheck) {
      try {
        const available = await compressionCheck();
        result.checks.compression = { healthy: available, available };
        if (!available) result.healthy = false;
      } catch (error) {
        result.checks.compression = {
          healthy: false,
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        result.healthy = false;
      }
    }

    // Balance cache health check
    if (balanceCheck) {
      try {
        const cached = await balanceCheck();
        result.checks.balance = { healthy: true, cached };
      } catch (error) {
        result.checks.balance = {
          healthy: false,
          cached: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return result;
  }

  /**
   * Get monitoring statistics
   */
  getStats(): MonitoringStats {
    const totalOperations = this.successCount + this.failureCount;
    const averageLatency = this.operationTimings.length > 0
      ? this.operationTimings.reduce((a, b) => a + b, 0) / this.operationTimings.length
      : 0;
    const successRate = totalOperations > 0
      ? this.successCount / totalOperations
      : 1;

    return {
      totalErrors: this.errors.length,
      errorsByType: { ...this.errorCounts },
      totalOperations,
      averageLatency,
      successRate,
      alerts: [...this.alerts],
    };
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.errors = [];
    this.metrics = [];
    this.alerts = [];
    this.errorCounts = {};
    this.operationTimings = [];
    this.successCount = 0;
    this.failureCount = 0;
    this.log('Monitoring data cleared');
  }

  /**
   * Export monitoring data for analysis
   */
  export(): {
    errors: ErrorEvent[];
    metrics: PerformanceMetric[];
    stats: MonitoringStats;
  } {
    return {
      errors: [...this.errors],
      metrics: [...this.metrics],
      stats: this.getStats(),
    };
  }

  /**
   * Check alert thresholds and trigger alerts
   */
  private checkAlertThresholds(): void {
    if (!this.config.alertThresholds) return;

    const now = Date.now();
    const stats = this.getStats();

    // Check error rate
    if (this.config.alertThresholds.maxErrorRate) {
      const recentErrors = this.errors.filter(e => now - e.timestamp < 60000);
      const errorRate = recentErrors.length;
      
      if (errorRate > this.config.alertThresholds.maxErrorRate) {
        this.triggerAlert({
          type: 'error_rate',
          message: `Error rate (${errorRate}/min) exceeds threshold (${this.config.alertThresholds.maxErrorRate}/min)`,
          severity: 'critical',
          timestamp: now,
          data: { errorRate, threshold: this.config.alertThresholds.maxErrorRate },
        });
      }
    }

    // Check latency
    if (this.config.alertThresholds.maxLatency && stats.averageLatency > this.config.alertThresholds.maxLatency) {
      this.triggerAlert({
        type: 'latency',
        message: `Average latency (${stats.averageLatency.toFixed(2)}ms) exceeds threshold (${this.config.alertThresholds.maxLatency}ms)`,
        severity: 'warning',
        timestamp: now,
        data: { latency: stats.averageLatency, threshold: this.config.alertThresholds.maxLatency },
      });
    }

    // Check failure rate
    if (this.config.alertThresholds.maxFailureRate && (1 - stats.successRate) > this.config.alertThresholds.maxFailureRate) {
      this.triggerAlert({
        type: 'failure_rate',
        message: `Failure rate (${((1 - stats.successRate) * 100).toFixed(2)}%) exceeds threshold (${(this.config.alertThresholds.maxFailureRate * 100).toFixed(2)}%)`,
        severity: 'critical',
        timestamp: now,
        data: { failureRate: 1 - stats.successRate, threshold: this.config.alertThresholds.maxFailureRate },
      });
    }
  }

  /**
   * Trigger an alert with cooldown
   */
  private triggerAlert(alert: Alert): void {
    const now = Date.now();
    const lastAlert = this.lastAlertTime[alert.type] || 0;

    // Check cooldown
    if (now - lastAlert < this.ALERT_COOLDOWN) {
      return;
    }

    this.alerts.push(alert);
    this.lastAlertTime[alert.type] = now;
    
    // Log alert
    console.warn(`[Monitor] ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    
    // Send to Sentry if available
    if (this.sentryInitialized && (window as any).Sentry) {
      (window as any).Sentry.captureMessage(alert.message, {
        level: alert.severity === 'critical' ? 'error' : 'warning',
        tags: { alert_type: alert.type },
        extra: alert.data,
      });
    }
  }

  /**
   * Map severity to Sentry level
   */
  private mapSeverityToSentryLevel(severity: ErrorEvent['severity']): string {
    switch (severity) {
      case 'critical': return 'fatal';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'error';
    }
  }

  /**
   * Start periodic cleanup of old data
   */
  private startPeriodicCleanup(): void {
    // Clean up data older than 1 hour every 10 minutes
    setInterval(() => {
      const cutoff = Date.now() - 3600000; // 1 hour
      this.errors = this.errors.filter(e => e.timestamp > cutoff);
      this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
      this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
    }, 600000); // 10 minutes
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[Monitor]', ...args);
    }
  }
}

// Global monitor instance
let globalMonitor: SdkMonitor | null = null;

/**
 * Initialize global monitoring
 */
export function initializeMonitoring(config?: Partial<MonitoringConfig>): SdkMonitor {
  globalMonitor = new SdkMonitor(config);
  return globalMonitor;
}

/**
 * Get global monitor instance
 */
export function getMonitor(): SdkMonitor | null {
  return globalMonitor;
}

/**
 * Disable monitoring
 */
export function disableMonitoring(): void {
  if (globalMonitor) {
    globalMonitor.clear();
    globalMonitor = null;
  }
}
