import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Studio } from './studio.entity';
import { User } from './user.entity';

export enum ActivityAction {
  // Studio actions
  STUDIO_CREATED = 'studio_created',
  STUDIO_UPDATED = 'studio_updated',
  STUDIO_DELETED = 'studio_deleted',
  
  // Member actions
  MEMBER_INVITED = 'member_invited',
  MEMBER_JOINED = 'member_joined',
  MEMBER_REMOVED = 'member_removed',
  MEMBER_ROLE_UPDATED = 'member_role_updated',
  
  // Project actions
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_DELETED = 'project_deleted',
  PROJECT_ARCHIVED = 'project_archived',
  
  // Scene actions
  SCENE_CREATED = 'scene_created',
  SCENE_UPDATED = 'scene_updated',
  SCENE_DELETED = 'scene_deleted',
  SCENE_REORDERED = 'scene_reordered',
  
  // Comment actions
  COMMENT_CREATED = 'comment_created',
  COMMENT_UPDATED = 'comment_updated',
  COMMENT_DELETED = 'comment_deleted',
  COMMENT_RESOLVED = 'comment_resolved',
  
  // File actions
  FILE_UPLOADED = 'file_uploaded',
  FILE_DELETED = 'file_deleted',
}

export enum ActivityTarget {
  STUDIO = 'studio',
  PROJECT = 'project',
  SCENE = 'scene',
  COMMENT = 'comment',
  USER = 'user',
  FILE = 'file',
}

@Entity('activity_logs')
@Index(['studioId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  studioId: string;

  @ManyToOne(() => Studio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studioId' })
  studio: Studio;

  @Column({ nullable: true })
  projectId: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ActivityAction,
  })
  action: ActivityAction;

  @Column({
    type: 'enum',
    enum: ActivityTarget,
  })
  target: ActivityTarget;

  @Column()
  targetId: string;

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
