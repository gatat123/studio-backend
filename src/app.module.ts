import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getTypeOrmConfig } from './config/typeorm.config';
import { validationSchema } from './config/validation';
import { AuthModule } from './auth/auth.module';
import { StudiosModule } from './studios/studios.module';
import { ProjectsModule } from './projects/projects.module';
import { ScenesModule } from './scenes/scenes.module';
import { CommentsModule } from './comments/comments.module';
import { SecurityModule } from './security/security.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmailModule } from './email/email.module';
import { PerformanceModule } from './performance/performance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getTypeOrmConfig,
      inject: [ConfigService],
    }),
    AuthModule,
    StudiosModule,
    ProjectsModule,
    ScenesModule,
    CommentsModule,
    SecurityModule,
    NotificationsModule,
    EmailModule,
    PerformanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
