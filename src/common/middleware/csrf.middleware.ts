import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private tokens = new Map<string, { token: string; expires: Date }>();

  use(req: Request, res: Response, next: NextFunction) {
    // CSRF 토큰 생성 엔드포인트
    if (req.path === '/api/csrf-token' && req.method === 'GET') {
      const sessionId = req.cookies?.sessionId || crypto.randomUUID();
      const token = this.generateToken();
      const expires = new Date(Date.now() + 3600000); // 1시간 후 만료

      this.tokens.set(sessionId, { token, expires });
      
      // 세션 쿠키 설정
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000,
      });

      return res.json({ token });
    }

    // GET, HEAD, OPTIONS 요청은 CSRF 검증 제외
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // CSRF 토큰 검증
    const sessionId = req.cookies?.sessionId;
    const providedToken = req.headers['x-csrf-token'] as string;

    if (!sessionId || !providedToken) {
      return res.status(403).json({ 
        error: 'CSRF token missing',
        message: 'CSRF 토큰이 필요합니다.' 
      });
    }

    const storedData = this.tokens.get(sessionId);
    
    if (!storedData || storedData.token !== providedToken) {
      return res.status(403).json({ 
        error: 'Invalid CSRF token',
        message: '유효하지 않은 CSRF 토큰입니다.' 
      });
    }

    if (new Date() > storedData.expires) {
      this.tokens.delete(sessionId);
      return res.status(403).json({ 
        error: 'CSRF token expired',
        message: 'CSRF 토큰이 만료되었습니다.' 
      });
    }

    // 토큰 정리 (만료된 토큰 제거)
    this.cleanupExpiredTokens();

    next();
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private cleanupExpiredTokens() {
    const now = new Date();
    for (const [sessionId, data] of this.tokens.entries()) {
      if (now > data.expires) {
        this.tokens.delete(sessionId);
      }
    }
  }
}
