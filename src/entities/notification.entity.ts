import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  COMMENT = 'comment',
  MENTION = 'mention',
  INVITE = 'invite',
  PROJECT_UPDATE = 'project_update',
  SCENE_UPDATE = 'scene_update',
  PROJECT_COMPLETED = 'project_completed',
  MEMBER_JOINED = 'member_joined',
  MEMBER_LEFT = 'member_left',
  TASK_ASSIGNED = 'task_assigned',
  DEADLINE_REMINDER = 'deadline_reminder',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('notifications')
@Index(['userId', 'read'])
@Index(['userId', 'type'])
@Index(['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column({ default: false })
  read: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'userId' })
  user: User;
}
