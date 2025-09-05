import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { promises as fs } from 'fs';
import * as sharp from 'sharp';
import * as path from 'path';

@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService) {}

  async uploadImage(file: Express.Multer.File, userId: string) {
    try {
      // 썸네일 생성
      const thumbnailPath = await this.generateThumbnail(file.path);
      
      // DB에 파일 정보 저장
      const uploadedFile = await this.prisma.file.create({
        data: {
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          thumbnailPath,
          userId,
        },
      });

      return {
        id: uploadedFile.id,
        url: `/uploads/${file.filename}`,
        thumbnailUrl: `/uploads/thumbnails/${path.basename(thumbnailPath)}`,
        originalName: file.originalname,
        size: file.size,
      };
    } catch (error) {
      // 업로드 실패 시 파일 삭제
      await this.deleteFile(file.path);
      throw new BadRequestException('파일 업로드에 실패했습니다.');
    }
  }

  async uploadMultipleImages(files: Express.Multer.File[], userId: string) {
    const results = await Promise.allSettled(
      files.map((file) => this.uploadImage(file, userId))
    );

    return {
      succeeded: results
        .filter((r) => r.status === 'fulfilled')
        .map((r: any) => r.value),
      failed: results
        .filter((r) => r.status === 'rejected')
        .map((r: any, index) => ({
          filename: files[index].originalname,
          error: r.reason?.message || '업로드 실패',
        })),
    };
  }

  private async generateThumbnail(imagePath: string): Promise<string> {
    const thumbnailDir = path.join('uploads', 'thumbnails');
    
    // 썸네일 디렉토리 생성
    await fs.mkdir(thumbnailDir, { recursive: true });
    
    const filename = path.basename(imagePath);
    const thumbnailPath = path.join(thumbnailDir, `thumb_${filename}`);

    await sharp(imagePath)
      .resize(300, 300, { fit: 'inside' })
      .toFile(thumbnailPath);

    return thumbnailPath;
  }

  async deleteFile(filePath: string) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('파일 삭제 실패:', error);
    }
  }

  async deleteUploadedFile(fileId: string, userId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, userId },
    });

    if (!file) {
      throw new BadRequestException('파일을 찾을 수 없습니다.');
    }

    // 실제 파일 삭제
    await this.deleteFile(file.path);
    if (file.thumbnailPath) {
      await this.deleteFile(file.thumbnailPath);
    }

    // DB에서 삭제
    await this.prisma.file.delete({
      where: { id: fileId },
    });

    return { success: true };
  }
}