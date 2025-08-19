# Logging Patterns in Schedule Service

This document outlines the comprehensive logging implementation in the Schedule Service with examples of different log levels and use cases.

## Log Levels Used

### 1. DEBUG Level

Used for detailed diagnostic information, typically only when diagnosing problems.

**Examples:**

```typescript
this.logger.debug(
  `${methodName}: Attempting to get cache for key: ${cacheKey}`,
);
this.logger.debug(
  `${methodName}: Filter applied for semester_paket: ${semesterPaket}`,
);
this.logger.debug(`Redis: Executing ${operationName}`, context);
```

**When to use:**

- Cache operations details
- Database query parameters
- Internal state changes
- Step-by-step operation tracking

### 2. INFO Level

Used for general information about application flow and successful operations.

**Examples:**

```typescript
this.logger.info(`${methodName} called`, {
  idKurikulum,
  semesterPaket,
  cacheKey,
});
this.logger.info(`${methodName}: Cache HIT for key: ${cacheKey}`, {
  cacheKey,
  dataSize: cachedData.length,
});
this.logger.info(`Performance: ${operationName} completed`, {
  duration: `${duration}ms`,
});
```

**When to use:**

- Method entry points
- Successful cache hits/misses
- Completed operations
- Performance metrics

### 3. WARN Level

Used for potentially harmful situations that don't stop the application.

**Examples:**

```typescript
this.logger.warn(`${methodName}: No classes found`, {
  idKurikulum,
  semesterPaket,
});
this.logger.warn(`${methodName}: Some classes not found in database`, {
  missingClassIds,
  totalMissing,
});
this.logger.warn(`Performance: ${operationName} took longer than expected`, {
  duration,
  threshold: '1000ms',
});
```

**When to use:**

- Business logic warnings (no data found)
- Performance issues (slow operations)
- Non-critical Redis failures
- Missing optional data

### 4. ERROR Level

Used for error events that might still allow the application to continue running.

**Examples:**

```typescript
this.logger.error(`${methodName}: NIM is required but not provided`, {
  classIds,
});
this.logger.error(`Redis: ${operationName} failed`, {
  error: error.message,
  stack: error.stack,
});
this.logger.error(`${methodName}: Unexpected error occurred`, {
  error: error.message,
  stack: error.stack,
});
```

**When to use:**

- Validation failures
- Redis connection errors
- Database errors
- Unexpected exceptions

## Redis-Specific Logging

### Redis Connection Events

```typescript
private setupRedisLogging(): void {
  this.redis.on('connect', () => {
    this.logger.info('Redis: Connected successfully', {
      status: this.redis.status,
      host: this.redis.options.host,
      port: this.redis.options.port,
    });
  });

  this.redis.on('error', (error) => {
    this.logger.error('Redis: Connection error', {
      error: error.message,
      stack: error.stack,
      status: this.redis.status,
      host: this.redis.options.host,
      port: this.redis.options.port,
    });
  });
}
```

### Safe Redis Operations

```typescript
private async safeRedisOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  context: Record<string, any> = {},
): Promise<T | null> {
  try {
    this.logger.debug(`Redis: Executing ${operationName}`, context);
    const result = await operation();
    this.logger.debug(`Redis: ${operationName} completed successfully`, {
      ...context,
      hasResult: result !== null && result !== undefined,
    });
    return result;
  } catch (error) {
    this.logger.error(`Redis: ${operationName} failed`, {
      error: error.message,
      stack: error.stack,
      redisStatus: this.redis.status,
      ...context,
    });
    return null;
  }
}
```

## Performance Monitoring

### Performance Measurement Utility

```typescript
private async measurePerformance<T>(
  operation: () => Promise<T>,
  operationName: string,
  context: Record<string, any> = {},
): Promise<T> {
  const startTime = Date.now();
  this.logger.debug(`Performance: Starting ${operationName}`, {
    ...context,
    startTime: new Date(startTime).toISOString(),
  });

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    if (duration > 1000) {
      this.logger.warn(`Performance: ${operationName} took longer than expected`, {
        ...context,
        duration: `${duration}ms`,
        threshold: '1000ms',
      });
    } else {
      this.logger.info(`Performance: ${operationName} completed`, {
        ...context,
        duration: `${duration}ms`,
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    this.logger.error(`Performance: ${operationName} failed`, {
      ...context,
      duration: `${duration}ms`,
      error: error.message,
    });
    throw error;
  }
}
```

## Best Practices Implemented

### 1. Structured Logging

- Always include relevant context data
- Use consistent key names across logs
- Include method names for traceability

### 2. Error Context

- Always include error message and stack trace
- Add relevant business context (IDs, parameters)
- Include system state when applicable

### 3. Performance Tracking

- Measure database operations
- Set thresholds for performance warnings
- Include operation context

### 4. Redis Resilience

- Handle Redis failures gracefully
- Log connection state changes
- Continue operation even if cache fails

### 5. Business Logic Tracking

- Log when no data is found
- Track missing entities
- Validate input parameters

## Log Output Examples

### Successful Cache Hit

```json
{
  "level": "info",
  "message": "getClassScheduleOffered: Cache HIT for key: class-schedule:12345:all",
  "cacheKey": "class-schedule:12345:all",
  "dataSize": 2048,
  "timestamp": "2025-08-19T10:30:00.000Z"
}
```

### Database Query Performance

```json
{
  "level": "info",
  "message": "Performance: Database Query - kelasDitawarkan.findMany completed",
  "idKurikulum": "12345",
  "duration": "234ms",
  "timestamp": "2025-08-19T10:30:00.000Z"
}
```

### Redis Connection Error

```json
{
  "level": "error",
  "message": "Redis: Connection error",
  "error": "Connection timeout",
  "stack": "Error: Connection timeout\n    at ...",
  "status": "connecting",
  "host": "localhost",
  "port": 6379,
  "timestamp": "2025-08-19T10:30:00.000Z"
}
```

### Business Logic Warning

```json
{
  "level": "warn",
  "message": "getClassStatusBatch: Some classes not found in database",
  "missingClassIds": ["class-001", "class-002"],
  "nim": "123456789",
  "totalMissing": 2,
  "timestamp": "2025-08-19T10:30:00.000Z"
}
```

This logging implementation provides comprehensive visibility into the application's behavior, making debugging and monitoring much more effective.
