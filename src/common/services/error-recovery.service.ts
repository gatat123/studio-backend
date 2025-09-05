import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: any) => void;
}

@Injectable()
export class ErrorRecoveryService {
  private readonly logger = new Logger(ErrorRecoveryService.name);

  constructor(private configService: ConfigService) {}

  /**
   * 재시도 로직을 포함한 함수 실행
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoff = true,
      onRetry,
    } = options;

    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        this.logger.warn(
          `Attempt ${attempt}/${maxAttempts} failed: ${error.message}`
        );

        if (onRetry) {
          onRetry(attempt, error);
        }

        if (attempt < maxAttempts) {
          const waitTime = backoff
            ? delay * Math.pow(2, attempt - 1)
            : delay;
          
          await this.sleep(waitTime);
        }
      }
    }

    this.logger.error(
      `All ${maxAttempts} attempts failed. Last error: ${lastError.message}`
    );
    
    throw lastError;
  }

  /**
   * Circuit Breaker 패턴 구현
   */
  createCircuitBreaker<T>(
    fn: () => Promise<T>,
    threshold: number = 5,
    timeout: number = 60000
  ) {
    let failures = 0;
    let lastFailTime: Date | null = null;
    let isOpen = false;

    return async (): Promise<T> => {
      // Circuit이 열려있는지 확인
      if (isOpen) {
        const now = new Date();
        if (lastFailTime && now.getTime() - lastFailTime.getTime() < timeout) {
          throw new Error('Circuit breaker is open');
        } else {
          // Timeout이 지났으면 half-open 상태로 전환
          isOpen = false;
          failures = 0;
        }
      }

      try {
        const result = await fn();
        failures = 0; // 성공 시 실패 카운트 리셋
        return result;
      } catch (error) {
        failures++;
        lastFailTime = new Date();

        if (failures >= threshold) {
          isOpen = true;
          this.logger.error(
            `Circuit breaker opened after ${failures} failures`
          );
        }

        throw error;
      }
    };
  }

  /**
   * Fallback 메커니즘
   */
  async executeWithFallback<T>(
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T> | T,
    logError: boolean = true
  ): Promise<T> {
    try {
      return await primaryFn();
    } catch (error) {
      if (logError) {
        this.logger.warn(
          `Primary function failed, using fallback: ${error.message}`
        );
      }
      
      return await Promise.resolve(fallbackFn());
    }
  }

  /**
   * 타임아웃을 포함한 실행
   */
  async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([fn(), timeoutPromise]);
  }

  /**
   * Bulkhead 패턴 - 동시 실행 제한
   */
  createBulkhead<T>(
    fn: (...args: any[]) => Promise<T>,
    maxConcurrent: number = 10
  ) {
    let running = 0;
    const queue: Array<() => void> = [];

    return async (...args: any[]): Promise<T> => {
      while (running >= maxConcurrent) {
        await new Promise<void>((resolve) => queue.push(resolve));
      }

      running++;

      try {
        return await fn(...args);
      } finally {
        running--;
        const next = queue.shift();
        if (next) next();
      }
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
