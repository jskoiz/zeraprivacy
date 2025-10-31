/**
 * analytics.ts
 * 
 * Purpose: SDK usage analytics and telemetry (opt-in)
 * 
 * This module provides privacy-respecting analytics for:
 * - SDK usage patterns
 * - Feature adoption metrics
 * - Performance insights
 * - Error patterns
 * 
 * ALL ANALYTICS ARE OPT-IN and respect user privacy.
 * No sensitive data (keys, addresses, amounts) is ever collected.
 */

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /** Enable analytics collection (default: false, must opt-in) */
  enabled: boolean;
  /** Analytics endpoint URL (optional, for custom analytics backend) */
  endpoint?: string;
  /** API key for analytics service */
  apiKey?: string;
  /** Anonymous user ID (generated if not provided) */
  userId?: string;
  /** Session ID (generated if not provided) */
  sessionId?: string;
  /** Application context */
  appContext?: {
    name?: string;
    version?: string;
    environment?: string;
  };
  /** Enable debug logging */
  debug?: boolean;
  /** Custom event handler */
  onEvent?: (event: AnalyticsEvent) => void;
  /** Batch size for sending events */
  batchSize?: number;
  /** Flush interval in milliseconds */
  flushInterval?: number;
}

/**
 * Analytics event types
 */
export type AnalyticsEventType =
  | 'sdk_initialized'
  | 'operation_started'
  | 'operation_completed'
  | 'operation_failed'
  | 'feature_used'
  | 'error_occurred'
  | 'performance_metric'
  | 'user_action'
  | 'custom';

/**
 * Analytics event data
 */
export interface AnalyticsEvent {
  /** Event type */
  type: AnalyticsEventType;
  /** Event name/category */
  name: string;
  /** Event properties (anonymized) */
  properties?: Record<string, any>;
  /** Timestamp */
  timestamp: number;
  /** Session ID */
  sessionId: string;
  /** User ID (anonymized) */
  userId: string;
  /** Application context */
  appContext?: {
    name?: string;
    version?: string;
    environment?: string;
  };
}

/**
 * Usage statistics
 */
export interface UsageStats {
  /** Total operations performed */
  totalOperations: number;
  /** Operations by type */
  operationsByType: Record<string, number>;
  /** Total errors */
  totalErrors: number;
  /** Errors by type */
  errorsByType: Record<string, number>;
  /** Feature usage counts */
  featureUsage: Record<string, number>;
  /** Average operation duration */
  averageOperationDuration: number;
  /** Session start time */
  sessionStart: number;
  /** Session duration (milliseconds) */
  sessionDuration: number;
}

/**
 * Feature tracking data
 */
export interface FeatureUsage {
  /** Feature name */
  feature: string;
  /** Usage count */
  count: number;
  /** First used timestamp */
  firstUsed: number;
  /** Last used timestamp */
  lastUsed: number;
  /** Average duration (if applicable) */
  averageDuration?: number;
}

/**
 * SDK Analytics class for tracking usage
 */
export class SdkAnalytics {
  private config: AnalyticsConfig;
  private events: AnalyticsEvent[] = [];
  private eventQueue: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId: string;
  private sessionStart: number;
  
  // Statistics
  private operationCounts: Record<string, number> = {};
  private errorCounts: Record<string, number> = {};
  private featureCounts: Record<string, number> = {};
  private operationDurations: number[] = [];
  
  // Flush timer
  private flushTimer?: ReturnType<typeof setInterval>;

  constructor(config?: Partial<AnalyticsConfig>) {
    this.config = {
      enabled: false, // Default to disabled - must opt in
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      debug: false,
      ...config,
    };

    // Generate IDs
    this.sessionId = this.config.sessionId || this.generateId();
    this.userId = this.config.userId || this.generateId();
    this.sessionStart = Date.now();

    // Start periodic flush if enabled
    if (this.config.enabled) {
      this.startPeriodicFlush();
      this.trackEvent({
        type: 'sdk_initialized',
        name: 'SDK Initialized',
        properties: {
          environment: this.config.appContext?.environment,
          version: this.config.appContext?.version,
        },
      });
    }
  }

  /**
   * Track an analytics event
   */
  trackEvent(event: Omit<AnalyticsEvent, 'timestamp' | 'sessionId' | 'userId' | 'appContext'>): void {
    if (!this.config.enabled) return;

    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      appContext: this.config.appContext,
    };

    // Store event
    this.events.push(fullEvent);
    this.eventQueue.push(fullEvent);

    // Update counts
    if (event.type === 'operation_completed' || event.type === 'operation_started') {
      this.operationCounts[event.name] = (this.operationCounts[event.name] || 0) + 1;
    }
    
    if (event.type === 'error_occurred') {
      this.errorCounts[event.name] = (this.errorCounts[event.name] || 0) + 1;
    }
    
    if (event.type === 'feature_used') {
      this.featureCounts[event.name] = (this.featureCounts[event.name] || 0) + 1;
    }

    // Track duration if provided
    if (event.properties?.duration) {
      this.operationDurations.push(event.properties.duration);
    }

    // Call custom handler
    if (this.config.onEvent) {
      try {
        this.config.onEvent(fullEvent);
      } catch (error) {
        this.log('Error in custom event handler:', error);
      }
    }

    // Flush if batch size reached
    if (this.eventQueue.length >= (this.config.batchSize || 10)) {
      this.flush();
    }

    this.log('Event tracked:', fullEvent);
  }

  /**
   * Track operation start
   */
  trackOperationStart(operation: string, properties?: Record<string, any>): () => void {
    const startTime = Date.now();
    
    this.trackEvent({
      type: 'operation_started',
      name: operation,
      properties,
    });

    // Return completion function
    return (success: boolean = true, additionalProperties?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      
      this.trackEvent({
        type: success ? 'operation_completed' : 'operation_failed',
        name: operation,
        properties: {
          ...properties,
          ...additionalProperties,
          duration,
          success,
        },
      });
    };
  }

  /**
   * Track feature usage
   */
  trackFeature(feature: string, properties?: Record<string, any>): void {
    this.trackEvent({
      type: 'feature_used',
      name: feature,
      properties,
    });
  }

  /**
   * Track error
   */
  trackError(error: string, properties?: Record<string, any>): void {
    this.trackEvent({
      type: 'error_occurred',
      name: error,
      properties,
    });
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric: string, value: number, properties?: Record<string, any>): void {
    this.trackEvent({
      type: 'performance_metric',
      name: metric,
      properties: {
        ...properties,
        value,
      },
    });
  }

  /**
   * Track custom event
   */
  trackCustom(name: string, properties?: Record<string, any>): void {
    this.trackEvent({
      type: 'custom',
      name,
      properties,
    });
  }

  /**
   * Get usage statistics
   */
  getStats(): UsageStats {
    const totalOperations = Object.values(this.operationCounts).reduce((a, b) => a + b, 0);
    const totalErrors = Object.values(this.errorCounts).reduce((a, b) => a + b, 0);
    const averageOperationDuration = this.operationDurations.length > 0
      ? this.operationDurations.reduce((a, b) => a + b, 0) / this.operationDurations.length
      : 0;

    return {
      totalOperations,
      operationsByType: { ...this.operationCounts },
      totalErrors,
      errorsByType: { ...this.errorCounts },
      featureUsage: { ...this.featureCounts },
      averageOperationDuration,
      sessionStart: this.sessionStart,
      sessionDuration: Date.now() - this.sessionStart,
    };
  }

  /**
   * Get feature usage details
   */
  getFeatureUsage(): FeatureUsage[] {
    const features: FeatureUsage[] = [];

    for (const [feature, count] of Object.entries(this.featureCounts)) {
      const featureEvents = this.events.filter(e => e.type === 'feature_used' && e.name === feature);
      
      if (featureEvents.length > 0) {
        const timestamps = featureEvents.map(e => e.timestamp);
        const durations = featureEvents
          .map(e => e.properties?.duration)
          .filter((d): d is number => typeof d === 'number');

        features.push({
          feature,
          count,
          firstUsed: Math.min(...timestamps),
          lastUsed: Math.max(...timestamps),
          averageDuration: durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : undefined,
        });
      }
    }

    return features;
  }

  /**
   * Flush queued events to analytics endpoint
   */
  async flush(): Promise<void> {
    if (!this.config.enabled || this.eventQueue.length === 0) {
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Send to custom endpoint if configured
      if (this.config.endpoint) {
        await this.sendToEndpoint(eventsToSend);
      }
      
      this.log(`Flushed ${eventsToSend.length} events`);
    } catch (error) {
      this.log('Error flushing events:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...eventsToSend);
    }
  }

  /**
   * Send events to analytics endpoint
   */
  private async sendToEndpoint(events: AnalyticsEvent[]): Promise<void> {
    if (!this.config.endpoint) return;

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
      },
      body: JSON.stringify({
        events,
        sessionId: this.sessionId,
        userId: this.userId,
        appContext: this.config.appContext,
      }),
    });

    if (!response.ok) {
      throw new Error(`Analytics endpoint returned ${response.status}`);
    }
  }

  /**
   * Export analytics data
   */
  export(): {
    events: AnalyticsEvent[];
    stats: UsageStats;
    features: FeatureUsage[];
  } {
    return {
      events: [...this.events],
      stats: this.getStats(),
      features: this.getFeatureUsage(),
    };
  }

  /**
   * Clear all analytics data
   */
  clear(): void {
    this.events = [];
    this.eventQueue = [];
    this.operationCounts = {};
    this.errorCounts = {};
    this.featureCounts = {};
    this.operationDurations = [];
    this.log('Analytics data cleared');
  }

  /**
   * Disable analytics
   */
  disable(): void {
    this.config.enabled = false;
    this.stopPeriodicFlush();
    this.clear();
    this.log('Analytics disabled');
  }

  /**
   * Enable analytics
   */
  enable(): void {
    this.config.enabled = true;
    this.startPeriodicFlush();
    this.trackEvent({
      type: 'sdk_initialized',
      name: 'SDK Re-enabled',
    });
    this.log('Analytics enabled');
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Start periodic flush
   */
  private startPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval || 30000);
  }

  /**
   * Stop periodic flush
   */
  private stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Generate anonymous ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[Analytics]', ...args);
    }
  }
}

// Global analytics instance
let globalAnalytics: SdkAnalytics | null = null;

/**
 * Initialize global analytics (OPT-IN)
 * 
 * @param config - Analytics configuration
 * @returns Analytics instance
 */
export function initializeAnalytics(config?: Partial<AnalyticsConfig>): SdkAnalytics {
  // Ensure user explicitly opts in
  if (!config?.enabled) {
    console.warn('[Analytics] Analytics must be explicitly enabled. Set enabled: true in config.');
    return new SdkAnalytics({ ...config, enabled: false });
  }

  globalAnalytics = new SdkAnalytics(config);
  return globalAnalytics;
}

/**
 * Get global analytics instance
 */
export function getAnalytics(): SdkAnalytics | null {
  return globalAnalytics;
}

/**
 * Disable global analytics
 */
export function disableAnalytics(): void {
  if (globalAnalytics) {
    globalAnalytics.disable();
    globalAnalytics = null;
  }
}

/**
 * Helper: Create anonymized operation properties
 * Strips sensitive data while preserving useful metrics
 */
export function anonymizeOperationProps(props: Record<string, any>): Record<string, any> {
  const anonymized: Record<string, any> = {};

  // Safe properties to include
  const safeProps = [
    'operation',
    'success',
    'duration',
    'error',
    'network',
    'cluster',
    'mode',
    'feature',
  ];

  for (const key of safeProps) {
    if (props[key] !== undefined) {
      anonymized[key] = props[key];
    }
  }

  // Convert amounts to ranges instead of exact values
  if (props.amount !== undefined) {
    anonymized.amountRange = getAmountRange(props.amount);
  }

  return anonymized;
}

/**
 * Helper: Convert amount to range for privacy
 */
function getAmountRange(amount: number): string {
  if (amount < 0.01) return '<0.01';
  if (amount < 0.1) return '0.01-0.1';
  if (amount < 1) return '0.1-1';
  if (amount < 10) return '1-10';
  if (amount < 100) return '10-100';
  return '100+';
}
