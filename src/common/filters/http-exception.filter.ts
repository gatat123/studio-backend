import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      
      if (typeof responseBody === 'object') {
        message = (responseBody as any).message || exception.message;
        error = (responseBody as any).error || 'Error';
      } else {
        message = responseBody;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // 에러 로깅
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Error: ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    // 사용자 친화적 에러 응답
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message: this.getSafeErrorMessage(status, message),
    });
  }

  private getSafeErrorMessage(status: number, originalMessage: string | string[]): string {
    // 개발 환경에서는 원본 메시지 반환
    if (process.env.NODE_ENV === 'development') {
      return Array.isArray(originalMessage) ? originalMessage.join(', ') : originalMessage;
    }

    // 프로덕션 환경에서는 안전한 메시지 반환
    const safeMessages: { [key: number]: string } = {
      400: '잘못된 요청입니다.',
      401: '인증이 필요합니다.',
      403: '권한이 없습니다.',
      404: '요청한 리소스를 찾을 수 없습니다.',
      409: '충돌이 발생했습니다.',
      422: '처리할 수 없는 요청입니다.',
      429: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
      500: '서버 오류가 발생했습니다.',
      502: '게이트웨이 오류가 발생했습니다.',
      503: '서비스를 일시적으로 사용할 수 없습니다.',
    };

    return safeMessages[status] || '알 수 없는 오류가 발생했습니다.';
  }
}
