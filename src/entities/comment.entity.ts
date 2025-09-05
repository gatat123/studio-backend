import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Scene } from './scene.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'scene_id' })
  sceneId: string;

  @ManyToOne(() => Scene, (scene) => scene.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scene_id' })
  scene: Scene;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.comments)
  @JoinColumn({ name: 'user_id' })
  author: User;

  @Column('text')
  content: string;

  // Position for location-based comments (percentage values 0-100)
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  positionX: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  positionY: number;

  @Column({ nullable: true })
  page: number; // For PDF pages

  // Thread structure
  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @ManyToOne(() => Comment, (comment) => comment.replies, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Comment;

  @OneToMany(() => Comment, (comment) => comment.parent)
  replies: Comment[];

  // Status
  @Column({ default: false })
  resolved: boolean;

  @Column({ default: false })
  pinned: boolean;

  // Mentions (stored as JSON array of user IDs)
  @Column('json', { nullable: true })
  mentions: string[];

  // Attachments
  @Column('json', { nullable: true })
  attachments: {
    type: 'image' | 'file';
    url: string;
    name: string;
  }[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}