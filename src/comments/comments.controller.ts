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
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Get all comments for a scene' })
  findAll(@Param('sceneId') sceneId: string) {
    return this.commentsService.findAll(sceneId);
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

  @Post('comments/:id/pin')
  @ApiOperation({ summary: 'Toggle pinned status of a comment' })
  togglePinned(@Param('id') id: string, @Request() req) {
    return this.commentsService.togglePinned(id, req.user.id);
  }
}