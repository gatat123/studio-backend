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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
