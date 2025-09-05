import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { EventsGateway } from '../websocket/events.gateway';
import { UsersService } from '../users/users.service';
import { Scene } from '../entities/scene.entity';
import { Project } from '../entities/project.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Scene)
    private readonly sceneRepository: Repository<Scene>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async create(sceneId: string, userId: string, createCommentDto: CreateCommentDto): Promise<Comment> {
    // Scene 존재 여부 확인 및 프로젝트 정보 가져오기
    const scene = await this.sceneRepository.findOne({
      where: { id: sceneId },
      relations: ['project'],
    });

    if (!scene) {
      throw new NotFoundException(`Scene with ID ${sceneId} not found`);
    }

    const comment = this.commentRepository.create({
      ...createCommentDto,
      sceneId,
      userId,
    });

    const savedComment = await this.commentRepository.save(comment);
    const fullComment = await this.findOne(savedComment.id);

    // WebSocket으로 실시간 알림
    this.eventsGateway.broadcastCommentCreate(scene.project.id, fullComment);

    // 멘션된 사용자들에게 알림 전송
    if (createCommentDto.mentions && createCommentDto.mentions.length > 0) {
      await this.notifyMentionedUsers(
        createCommentDto.mentions,
        fullComment,
        scene.project,
      );
    }

    return fullComment;
  }

  private async notifyMentionedUsers(
    mentionedUserIds: string[],
    comment: Comment,
    project: Project,
  ) {
    for (const userId of mentionedUserIds) {
      const notification = {
        type: 'mention',
        commentId: comment.id,
        projectId: project.id,
        projectTitle: project.title,
        message: `${comment.author.nickname || comment.author.email} mentioned you in a comment`,
        createdAt: new Date(),
      };

      // WebSocket을 통한 실시간 알림
      this.eventsGateway.broadcastProjectUpdate(project.id, {
        type: 'mention',
        notification,
      });
    }
  }

  async findAll(sceneId: string, filter?: {
    resolved?: boolean;
    pinned?: boolean;
    hasPosition?: boolean;
    parentId?: string | null;
  }): Promise<Comment[]> {
    const query = this.commentRepository.createQueryBuilder('comment')
      .leftJoinAndSelect('comment.author', 'author')
      .leftJoinAndSelect('comment.replies', 'replies')
      .leftJoinAndSelect('replies.author', 'repliesAuthor')
      .where('comment.sceneId = :sceneId', { sceneId });

    // 필터 적용
    if (filter) {
      if (filter.resolved !== undefined) {
        query.andWhere('comment.resolved = :resolved', { resolved: filter.resolved });
      }
      if (filter.pinned !== undefined) {
        query.andWhere('comment.pinned = :pinned', { pinned: filter.pinned });
      }
      if (filter.hasPosition === true) {
        query.andWhere('comment.positionX IS NOT NULL AND comment.positionY IS NOT NULL');
      }
      if (filter.hasPosition === false) {
        query.andWhere('comment.positionX IS NULL AND comment.positionY IS NULL');
      }
      if (filter.parentId !== undefined) {
        if (filter.parentId === null) {
          query.andWhere('comment.parentId IS NULL');
        } else {
          query.andWhere('comment.parentId = :parentId', { parentId: filter.parentId });
        }
      }
    } else {
      // 기본적으로 최상위 댓글만 가져오기
      query.andWhere('comment.parentId IS NULL');
    }

    // 정렬: 고정된 댓글 먼저, 그다음 최신순
    query.orderBy('comment.pinned', 'DESC')
         .addOrderBy('comment.createdAt', 'DESC');

    return query.getMany();
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

    // Scene 정보 가져오기
    const scene = await this.sceneRepository.findOne({
      where: { id: comment.sceneId },
      relations: ['project'],
    });

    Object.assign(comment, updateCommentDto);
    await this.commentRepository.save(comment);

    const updatedComment = await this.findOne(id);

    // WebSocket으로 실시간 알림
    if (scene) {
      this.eventsGateway.broadcastCommentUpdate(scene.project.id, updatedComment);
    }

    return updatedComment;
  }

  async remove(id: string, userId: string): Promise<void> {
    const comment = await this.findOne(id);

    // Only the comment owner can delete
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Scene 정보 가져오기
    const scene = await this.sceneRepository.findOne({
      where: { id: comment.sceneId },
      relations: ['project'],
    });

    await this.commentRepository.remove(comment);

    // WebSocket으로 실시간 알림
    if (scene) {
      this.eventsGateway.broadcastCommentDelete(scene.project.id, id);
    }
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