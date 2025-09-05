import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1분
        limit: 10, // 1분당 10개 요청
      },
      {
        ttl: 3600000, // 1시간
        limit: 100, // 1시간당 100개 요청
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class SecurityModule {}
