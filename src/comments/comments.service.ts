import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
  ) {}

  async create(sceneId: string, userId: string, createCommentDto: CreateCommentDto): Promise<Comment> {
    const comment = this.commentRepository.create({
      ...createCommentDto,
      sceneId,
      userId,
    });

    const savedComment = await this.commentRepository.save(comment);
    return this.findOne(savedComment.id);
  }

  async findAll(sceneId: string): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { sceneId, parentId: null }, // Only get top-level comments
      relations: ['author', 'replies', 'replies.author'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['author', 'replies', 'replies.author', 'parent'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    return comment;
  }
  async update(id: string, userId: string, updateCommentDto: UpdateCommentDto): Promise<Comment> {
    const comment = await this.findOne(id);

    // Only the comment owner can update
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    Object.assign(comment, updateCommentDto);
    await this.commentRepository.save(comment);

    return this.findOne(id);
  }

  async remove(id: string, userId: string): Promise<void> {
    const comment = await this.findOne(id);

    // Only the comment owner can delete
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepository.remove(comment);
  }

  async reply(commentId: string, userId: string, createCommentDto: CreateCommentDto): Promise<Comment> {
    const parentComment = await this.findOne(commentId);

    const reply = this.commentRepository.create({
      ...createCommentDto,
      sceneId: parentComment.sceneId,
      userId,
      parentId: commentId,
    });

    const savedReply = await this.commentRepository.save(reply);
    return this.findOne(savedReply.id);
  }

  async toggleResolved(id: string, userId: string): Promise<Comment> {
    const comment = await this.findOne(id);

    // Allow scene owner or comment owner to resolve
    comment.resolved = !comment.resolved;
    await this.commentRepository.save(comment);

    return this.findOne(id);
  }

  async togglePinned(id: string, userId: string): Promise<Comment> {
    const comment = await this.findOne(id);

    // Only allow project owners to pin comments
    comment.pinned = !comment.pinned;
    await this.commentRepository.save(comment);

    return this.findOne(id);
  }
}