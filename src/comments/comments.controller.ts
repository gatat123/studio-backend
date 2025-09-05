import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('comments')
@Controller('api')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('scenes/:sceneId/comments')
  @ApiOperation({ summary: 'Create a new comment on a scene' })
  create(
    @Param('sceneId') sceneId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req,
  ) {
    return this.commentsService.create(sceneId, req.user.id, createCommentDto);
  }

  @Get('scenes/:sceneId/comments')
  @ApiOperation({ summary: 'Get all comments for a scene with optional filters' })
  findAll(
    @Param('sceneId') sceneId: string,
    @Query('resolved') resolved?: string,
    @Query('pinned') pinned?: string,
    @Query('hasPosition') hasPosition?: string,
    @Query('parentId') parentId?: string,
  ) {
    const filter: any = {};
    
    if (resolved !== undefined) {
      filter.resolved = resolved === 'true';
    }
    if (pinned !== undefined) {
      filter.pinned = pinned === 'true';
    }
    if (hasPosition !== undefined) {
      filter.hasPosition = hasPosition === 'true';
    }
    if (parentId !== undefined) {
      filter.parentId = parentId === 'null' ? null : parentId;
    }

    return this.commentsService.findAll(sceneId, Object.keys(filter).length > 0 ? filter : undefined);
  }

  @Get('comments/:id')
  @ApiOperation({ summary: 'Get a single comment' })
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch('comments/:id')
  @ApiOperation({ summary: 'Update a comment' })
  update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req,
  ) {
    return this.commentsService.update(id, req.user.id, updateCommentDto);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Delete a comment' })
  remove(@Param('id') id: string, @Request() req) {
    return this.commentsService.remove(id, req.user.id);
  }
  @Post('comments/:id/reply')
  @ApiOperation({ summary: 'Reply to a comment' })
  reply(
    @Param('id') id: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req,
  ) {
    return this.commentsService.reply(id, req.user.id, createCommentDto);
  }

  @Patch('comments/:id/resolve')
  @ApiOperation({ summary: 'Toggle resolved status of a comment' })
  toggleResolved(@Param('id') id: string, @Request() req) {
    return this.commentsService.toggleResolved(id, req.user.id);
  }

  @Post('scenes/:sceneId/comments/with-files')
  @ApiOperation({ summary: 'Create a comment with file attachments' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads/comment-attachments',
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        // 허용된 파일 타입
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async createWithFiles(
    @Param('sceneId') sceneId: string,
    @Body() createCommentDto: CreateCommentDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    // 파일 정보를 DTO에 추가
    if (files && files.length > 0) {
      createCommentDto.attachments = files.map(file => ({
        type: file.mimetype.startsWith('image/') ? 'image' : 'file',
        url: `/uploads/comment-attachments/${file.filename}`,
        name: file.originalname,
      }));
    }

    return this.commentsService.create(sceneId, req.user.id, createCommentDto);
  }

  @Post('comments/:id/pin')
  @ApiOperation({ summary: 'Toggle pinned status of a comment' })
  togglePinned(@Param('id') id: string, @Request() req) {
    return this.commentsService.togglePinned(id, req.user.id);
  }
}