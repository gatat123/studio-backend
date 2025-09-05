import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  NotificationSettingsDto,
  GetNotificationsQueryDto,
  MarkNotificationReadDto,
} from './dto/notification-settings.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Request() req,
    @Query() query: GetNotificationsQueryDto,
  ) {
    return this.notificationsService.getNotifications(req.user.id, query);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Get('settings')
  async getUserSettings(@Request() req) {
    return this.notificationsService.getUserSettings(req.user.id);
  }

  @Put('settings')
  async updateUserSettings(
    @Request() req,
    @Body() dto: NotificationSettingsDto,
  ) {
    return this.notificationsService.updateUserSettings(req.user.id, dto);
  }

  @Put(':id/read')
  async markAsRead(
    @Request() req,
    @Param('id') notificationId: string,
    @Body() dto: MarkNotificationReadDto,
  ) {
    return this.notificationsService.markAsRead(req.user.id, notificationId, dto);
  }

  @Post('mark-all-read')
  async markAllAsRead(@Request() req) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true };
  }

  @Delete('all')
  async deleteAllNotifications(@Request() req) {
    await this.notificationsService.deleteAllNotifications(req.user.id);
    return { success: true };
  }

  @Delete(':id')
  async deleteNotification(
    @Request() req,
    @Param('id') notificationId: string,
  ) {
    await this.notificationsService.deleteNotification(req.user.id, notificationId);
    return { success: true };
  }
}
