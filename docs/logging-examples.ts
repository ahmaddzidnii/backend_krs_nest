// Example: How to implement logging patterns in other services

import { Injectable, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Redis } from 'ioredis';

@Injectable()
export class ExampleService {
  @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger;

  constructor(private readonly redis: Redis) {}

  // Example: Basic method logging
  async getUserById(userId: string) {
    const methodName = 'getUserById';

    this.logger.info(`${methodName} called`, { userId });

    try {
      if (!userId) {
        this.logger.error(`${methodName}: userId is required`, { userId });
        throw new Error('User ID is required');
      }

      this.logger.debug(`${methodName}: Fetching user from database`, {
        userId,
      });

      // Simulate database operation
      const user = await this.fetchUserFromDB(userId);

      if (!user) {
        this.logger.warn(`${methodName}: User not found`, { userId });
        return null;
      }

      this.logger.info(`${methodName}: User found successfully`, {
        userId,
        userName: user.name,
      });

      return user;
    } catch (error) {
      this.logger.error(`${methodName}: Unexpected error`, {
        error: error.message,
        stack: error.stack,
        userId,
      });
      throw error;
    }
  }

  // Example: Redis caching with error handling
  async getCachedData(key: string) {
    const methodName = 'getCachedData';

    try {
      this.logger.debug(`${methodName}: Attempting to get cache`, { key });

      const cachedData = await this.redis.get(key);

      if (cachedData) {
        this.logger.info(`${methodName}: Cache HIT`, {
          key,
          dataSize: cachedData.length,
        });
        return JSON.parse(cachedData);
      } else {
        this.logger.info(`${methodName}: Cache MISS`, { key });
        return null;
      }
    } catch (error) {
      this.logger.error(`${methodName}: Redis operation failed`, {
        error: error.message,
        key,
        redisStatus: this.redis.status,
      });
      return null; // Return null instead of throwing to allow fallback
    }
  }

  // Example: Performance monitoring
  async expensiveOperation(data: any) {
    const methodName = 'expensiveOperation';
    const startTime = Date.now();

    this.logger.info(`${methodName}: Starting operation`, {
      dataSize: JSON.stringify(data).length,
    });

    try {
      // Simulate expensive operation
      await this.processData(data);

      const duration = Date.now() - startTime;

      if (duration > 2000) {
        this.logger.warn(`${methodName}: Operation slow`, {
          duration: `${duration}ms`,
          threshold: '2000ms',
        });
      } else {
        this.logger.info(`${methodName}: Operation completed`, {
          duration: `${duration}ms`,
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`${methodName}: Operation failed`, {
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  // Example: Batch operation logging
  async processBatch(items: any[]) {
    const methodName = 'processBatch';

    this.logger.info(`${methodName}: Processing batch`, {
      totalItems: items.length,
    });

    let successCount = 0;
    let failureCount = 0;
    const failures: any[] = [];

    for (const item of items) {
      try {
        await this.processItem(item);
        successCount++;

        this.logger.debug(`${methodName}: Item processed successfully`, {
          itemId: item.id,
        });
      } catch (error) {
        failureCount++;
        failures.push({ item, error: error.message });

        this.logger.warn(`${methodName}: Item processing failed`, {
          itemId: item.id,
          error: error.message,
        });
      }
    }

    this.logger.info(`${methodName}: Batch processing completed`, {
      totalItems: items.length,
      successCount,
      failureCount,
      successRate: `${((successCount / items.length) * 100).toFixed(2)}%`,
    });

    if (failureCount > 0) {
      this.logger.warn(`${methodName}: Some items failed processing`, {
        failures: failures.map((f) => ({ itemId: f.item.id, error: f.error })),
      });
    }

    return { successCount, failureCount, failures };
  }

  // Example: Input validation logging
  async validateAndProcess(input: any) {
    const methodName = 'validateAndProcess';

    this.logger.debug(`${methodName}: Validating input`, {
      inputKeys: Object.keys(input),
    });

    const errors: string[] = [];

    if (!input.name) {
      errors.push('name is required');
    }

    if (!input.email) {
      errors.push('email is required');
    }

    if (errors.length > 0) {
      this.logger.error(`${methodName}: Validation failed`, {
        errors,
        input: { ...input, password: '[REDACTED]' }, // Don't log sensitive data
      });
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    this.logger.info(`${methodName}: Input validation passed`, {
      name: input.name,
      email: input.email,
    });

    // Process the validated input
    return await this.processValidInput(input);
  }

  // Helper methods (mock implementations)
  private async fetchUserFromDB(userId: string) {
    // Mock implementation
    return userId ? { id: userId, name: 'John Doe' } : null;
  }

  private async processData(data: any) {
    // Mock expensive operation
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private async processItem(item: any) {
    // Mock item processing
    if (Math.random() > 0.8) {
      throw new Error('Random processing error');
    }
  }

  private async processValidInput(input: any) {
    // Mock processing
    return { processed: true, input };
  }
}
