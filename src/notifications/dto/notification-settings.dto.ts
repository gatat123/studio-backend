import { IsOptional, IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '../notifications.types';

export class NotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  commentNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  mentionNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  projectUpdateNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  deadlineReminderNotifications?: boolean;

  @IsOptional()
  @IsEnum(NotificationType, { each: true })
  mutedNotificationTypes?: NotificationType[];
}

export class GetNotificationsQueryDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unreadOnly?: boolean;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

export class MarkNotificationReadDto {
  @IsOptional()
  @IsBoolean()
  read?: boolean = true;
}
