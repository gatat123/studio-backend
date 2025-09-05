import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @GetUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.');
    }
    return this.uploadService.uploadImage(file, userId);
  }

  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleImages(
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser('id') userId: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('파일이 없습니다.');
    }
    return this.uploadService.uploadMultipleImages(files, userId);
  }

  @Delete(':id')
  async deleteFile(
    @Param('id') fileId: string,
    @GetUser('id') userId: string,
  ) {
    return this.uploadService.deleteUploadedFile(fileId, userId);
  }
}
