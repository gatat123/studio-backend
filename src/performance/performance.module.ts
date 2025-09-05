import { Module, Global } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { CacheService } from './cache.service';
import { MetricsController } from './metrics.controller';
import { PerformanceInterceptor } from './performance.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    PerformanceService,
    CacheService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
  exports: [PerformanceService, CacheService],
})
export class PerformanceModule {}