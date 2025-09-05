import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { NotificationSettings } from '../entities/notification-settings.entity';
import { User } from '../entities/user.entity';
import { EventsGateway } from '../websocket/events.gateway';
import { EmailService } from '../email/email.service';
import {
  NotificationType,
  NotificationPriority,
  NotificationMetadata,
} from './notifications.types';
import {
  NotificationSettingsDto,
  GetNotificationsQueryDto,
  MarkNotificationReadDto,
} from './dto/notification-settings.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationSettings)
    private notificationSettingsRepository: Repository<NotificationSettings>,
    private eventsGateway: EventsGateway,
    private emailService: EmailService,
  ) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: NotificationMetadata,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
  ): Promise<Notification> {
    // Check user's notification settings
    const settings = await this.getUserSettings(userId);
    
    // Check if this notification type is muted
    if (settings?.mutedNotificationTypes?.includes(type)) {
      this.logger.debug(`Notification type ${type} is muted for user ${userId}`);
      return null;
    }

    // Create notification entity
    const notification = this.notificationRepository.create({
      userId,
      type,
      title,
      message,
      metadata,
      priority,
      read: false,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Send real-time notification via WebSocket
    this.eventsGateway.sendNotification(userId, {
      id: savedNotification.id,
      type,
      title,
      message,
      metadata,
      priority,
      read: false,
      createdAt: savedNotification.createdAt,
    });

    // Send email notification if enabled
    if (this.shouldSendEmail(settings, type, priority)) {
      await this.sendEmailNotification(userId, notification);
    }

    return savedNotification;
  }

  async getNotifications(
    userId: string,
    query: GetNotificationsQueryDto,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (query.unreadOnly) {
      queryBuilder.andWhere('notification.read = :read', { read: false });
    }

    if (query.type) {
      queryBuilder.andWhere('notification.type = :type', { type: query.type });
    }

    queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip(query.offset)
      .take(query.limit);

    const [notifications, total] = await queryBuilder.getManyAndCount();

    return { notifications, total };
  }

  async markAsRead(
    userId: string,
    notificationId: string,
    dto: MarkNotificationReadDto = { read: true },
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.read = dto.read;
    notification.readAt = dto.read ? new Date() : null;

    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, read: false },
      { read: true, readAt: new Date() },
    );
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    await this.notificationRepository.delete({ userId });
  }

  async getUserSettings(userId: string): Promise<NotificationSettings> {
    let settings = await this.notificationSettingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      // Create default settings if not exist
      settings = this.notificationSettingsRepository.create({
        userId,
        emailNotifications: true,
        pushNotifications: true,
        commentNotifications: true,
        mentionNotifications: true,
        projectUpdateNotifications: true,
        deadlineReminderNotifications: true,
        mutedNotificationTypes: [],
      });
      await this.notificationSettingsRepository.save(settings);
    }

    return settings;
  }

  async updateUserSettings(
    userId: string,
    dto: NotificationSettingsDto,
  ): Promise<NotificationSettings> {
    let settings = await this.getUserSettings(userId);

    Object.assign(settings, dto);

    return this.notificationSettingsRepository.save(settings);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, read: false },
    });
  }

  private shouldSendEmail(
    settings: NotificationSettings,
    type: NotificationType,
    priority: NotificationPriority,
  ): boolean {
    if (!settings?.emailNotifications) return false;

    // Always send urgent notifications
    if (priority === NotificationPriority.URGENT) return true;

    // Check specific notification type settings
    switch (type) {
      case NotificationType.COMMENT:
        return settings.commentNotifications;
      case NotificationType.MENTION:
        return settings.mentionNotifications;
      case NotificationType.PROJECT_UPDATE:
        return settings.projectUpdateNotifications;
      case NotificationType.DEADLINE_REMINDER:
        return settings.deadlineReminderNotifications;
      default:
        return true;
    }
  }

  private async sendEmailNotification(
    userId: string,
    notification: Notification,
  ): Promise<void> {
    try {
      // Implementation will be added when EmailService is ready
      this.logger.debug(`Email notification would be sent to user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`);
    }
  }
}
