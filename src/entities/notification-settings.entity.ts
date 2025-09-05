import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('notification_settings')
@Index(['userId'], { unique: true })
export class NotificationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ default: true })
  emailNotifications: boolean;

  @Column({ default: true })
  pushNotifications: boolean;

  @Column({ default: true })
  commentNotifications: boolean;

  @Column({ default: true })
  mentionNotifications: boolean;

  @Column({ default: true })
  projectUpdateNotifications: boolean;

  @Column({ default: true })
  deadlineReminderNotifications: boolean;

  @Column('text', { array: true, default: () => 'ARRAY[]::text[]' })
  mutedNotificationTypes: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
