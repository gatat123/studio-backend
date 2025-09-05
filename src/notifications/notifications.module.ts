import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from '../entities/notification.entity';
import { NotificationSettings } from '../entities/notification-settings.entity';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationSettings]),
    UsersModule,
    EmailModule,
    WebSocketModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
