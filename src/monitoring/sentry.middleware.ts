import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SentryMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {
    const dsn = this.configService.get('SENTRY_DSN');
    
    if (dsn) {
      Sentry.init({
        dsn,
        environment: this.configService.get('NODE_ENV', 'development'),
        tracesSampleRate: 1.0,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({
            app: true,
            router: true,
          }),
        ],
      });
    }
  }

  use(req: Request, res: Response, next: NextFunction) {
    Sentry.getCurrentHub().configureScope((scope) => {
      scope.setContext('request', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        ip: req.ip,
      });

      if (req.user) {
        scope.setUser({
          id: req.user['id'],
          email: req.user['email'],
        });
      }
    });

    next();
  }
}
