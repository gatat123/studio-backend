import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = `${uuidv4()}${extname(file.originalname)}`;
          callback(null, uniqueSuffix);
        },
      }),
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'application/pdf'
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('지원하지 않는 파일 형식입니다.'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
