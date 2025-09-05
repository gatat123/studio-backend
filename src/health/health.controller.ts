import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    // 데이터베이스 연결 확인
    const dbHealth = await this.checkDatabase();
    
    // 시스템 상태
    const systemHealth = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    return {
      status: dbHealth ? 'healthy' : 'unhealthy',
      database: dbHealth,
      system: systemHealth,
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }
}
