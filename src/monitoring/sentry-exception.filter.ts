import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    // Sentry로 에러 전송
    if (status >= 500) {
      Sentry.captureException(exception, {
        contexts: {
          request: {
            method: request.method,
            url: request.url,
            headers: request.headers,
            body: request.body,
          },
        },
      });
    }

    // 에러 로깅
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status}`,
      exception instanceof Error ? exception.stack : exception,
    );

    // 응답 전송
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}
