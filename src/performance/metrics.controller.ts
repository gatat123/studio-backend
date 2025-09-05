import { Controller, Post, Body, Get } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { Public } from '../auth/decorators/public.decorator';

interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
}

@Controller('api/metrics')
export class MetricsController {
  constructor(private performanceService: PerformanceService) {}

  @Public()
  @Post()
  async recordMetric(@Body() metric: WebVitalsMetric) {
    await this.performanceService.recordWebVitals(metric);
    return { success: true };
  }

  @Get()
  async getMetrics() {
    return this.performanceService.getMetrics();
  }

  @Get('report')
  async getReport() {
    return this.performanceService.generateReport();
  }
}