import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';

const logDir = path.join(process.cwd(), 'logs');

// 커스텀 로그 포맷
const customFormat = winston.format.printf(({ timestamp, level, message, context, trace }) => {
  return `${timestamp} [${level}] [${context}]: ${message}${trace ? `\n${trace}` : ''}`;
});

// 환경별 로그 레벨
const getLogLevel = (): string => {
  const env = process.env.NODE_ENV;
  switch (env) {
    case 'production':
      return 'error';
    case 'development':
      return 'debug';
    default:
      return 'info';
  }
};

export const winstonConfig = WinstonModule.createLogger({
  transports: [
    // 콘솔 출력
    new winston.transports.Console({
      level: getLogLevel(),
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.colorize({ all: true }),
        winston.format.errors({ stack: true }),
        customFormat,
      ),
    }),
    
    // 에러 로그 파일
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // 전체 로그 파일 (개발 환경에서만)
    ...(process.env.NODE_ENV !== 'production'
      ? [
          new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            format: winston.format.combine(
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              winston.format.json(),
            ),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        ]
      : []),
  ],
  
  // 예외 처리
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json(),
      ),
    }),
  ],
  
  // Promise rejection 처리
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json(),
      ),
    }),
  ],
  
  exitOnError: false,
});
