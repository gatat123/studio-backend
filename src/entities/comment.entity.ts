import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { File } from './file.entity';
import { Scene } from './scene.entity';
import { User } from './user.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'float', nullable: true })
  positionX: number;

  @Column({ type: 'float', nullable: true })
  positionY: number;

  @Column({ type: 'int', nullable: true })
  page: number;

  @Column({ default: false })
  resolved: boolean;

  @Column({ default: false })
  pinned: boolean;

  @Column('simple-array', { nullable: true })
  mentions: string[];

  @Column({ type: 'jsonb', nullable: true })
  attachments: {
    type: 'image' | 'file';
    url: string;
    name: string;
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Scene, (scene) => scene.comments, { nullable: true })
  @JoinColumn({ name: 'scene_id' })
  scene: Scene;

  @ManyToOne(() => File, (file) => file.comments, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: File;

  @Index()
  @ManyToOne(() => User, (user) => user.comments)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Comment, (comment) => comment.replies, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Comment;

  @OneToMany(() => Comment, (comment) => comment.parent)
  replies: Comment[];
}
