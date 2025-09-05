import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, ActivityAction, ActivityTarget } from '../entities/activity-log.entity';

export interface LogActivityOptions {
  studioId?: string;
  projectId?: string;
  userId: string;
  action: ActivityAction;
  target: ActivityTarget;
  targetId: string;
  details?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
  ) {}

  async log(options: LogActivityOptions): Promise<ActivityLog> {
    const activity = this.activityLogRepository.create(options);
    return await this.activityLogRepository.save(activity);
  }

  async getStudioActivities(
    studioId: string,
    options: {
      page?: number;
      limit?: number;
      action?: ActivityAction;
      userId?: string;
      target?: ActivityTarget;
    } = {},
  ) {
    const { page = 1, limit = 20, action, userId, target } = options;
    const skip = (page - 1) * limit;

    const query = this.activityLogRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .where('activity.studioId = :studioId', { studioId })
      .orderBy('activity.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (action) {
      query.andWhere('activity.action = :action', { action });
    }

    if (userId) {
      query.andWhere('activity.userId = :userId', { userId });
    }

    if (target) {
      query.andWhere('activity.target = :target', { target });
    }

    const [activities, total] = await query.getManyAndCount();

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getProjectActivities(
    projectId: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const query = this.activityLogRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .where('activity.projectId = :projectId', { projectId })
      .orderBy('activity.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [activities, total] = await query.getManyAndCount();

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserActivities(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      studioId?: string;
    } = {},
  ) {
    const { page = 1, limit = 20, studioId } = options;
    const skip = (page - 1) * limit;

    const query = this.activityLogRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.studio', 'studio')
      .where('activity.userId = :userId', { userId })
      .orderBy('activity.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (studioId) {
      query.andWhere('activity.studioId = :studioId', { studioId });
    }

    const [activities, total] = await query.getManyAndCount();

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getRecentActivities(
    studioId: string,
    limit: number = 10,
  ): Promise<ActivityLog[]> {
    return await this.activityLogRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .where('activity.studioId = :studioId', { studioId })
      .orderBy('activity.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async cleanup(olderThanDays: number = 90): Promise<void> {
    const date = new Date();
    date.setDate(date.getDate() - olderThanDays);

    await this.activityLogRepository
      .createQueryBuilder('activity')
      .delete()
      .where('activity.createdAt < :date', { date })
      .execute();
  }
}
