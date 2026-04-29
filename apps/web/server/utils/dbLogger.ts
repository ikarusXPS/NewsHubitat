/**
 * Database event logger for structured JSON logging
 * Per D-07: Log pool exhaustion, timeouts, reconnects
 */

interface DbLogEvent {
  event: 'db_connect' | 'db_disconnect' | 'db_error' | 'db_pool_exhausted' | 'db_timeout' | 'db_health_check' | 'db_health_check_failed';
  timestamp: string;
  duration_ms?: number;
  error?: string;
  pool_size?: number;
  active_connections?: number;
}

export function logDbEvent(event: DbLogEvent): void {
  const logEntry = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  // Structured JSON output for production log aggregation
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(logEntry));
  } else {
    // Human-readable format for development
    const { event: eventName, ...rest } = logEntry;
    console.log(`[DB] ${eventName}`, rest);
  }
}

export function logDbError(eventName: DbLogEvent['event'], error: Error, durationMs?: number): void {
  logDbEvent({
    event: eventName,
    timestamp: new Date().toISOString(),
    error: error.message,
    duration_ms: durationMs,
  });
}

export function logDbHealthCheck(success: boolean, durationMs: number, error?: Error): void {
  if (success) {
    logDbEvent({
      event: 'db_health_check',
      timestamp: new Date().toISOString(),
      duration_ms: durationMs,
    });
  } else {
    logDbEvent({
      event: 'db_health_check_failed',
      timestamp: new Date().toISOString(),
      duration_ms: durationMs,
      error: error?.message,
    });
  }
}
