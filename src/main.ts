import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // CORS 설정
  app.enableCors({
    origin: configService.get('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
  });

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Cookie Parser
  app.use(cookieParser());

  // Global Prefix
  app.setGlobalPrefix('api');

  const port = configService.get('PORT', 3001);
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
