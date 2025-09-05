import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    this.logger.log(
      `Incoming Request: ${method} ${url} - IP: ${ip} - UserAgent: ${userAgent}`,
    );

    return next
      .handle()
      .pipe(
        tap((response) => {
          const responseTime = Date.now() - now;
          this.logger.log(
            `Response: ${method} ${url} - Status: ${request.res.statusCode} - Time: ${responseTime}ms`,
          );
        }),
      );
  }
}
