import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { Comment } from '../../entities/comment.entity';
import { SceneVersion } from './scene-version.entity';

export enum SceneStatus {
  EMPTY = 'empty',
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
}

export interface SceneImage {
  url: string;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
  uploadedAt?: Date;
  uploadedBy?: string;
  version?: number;
}

@Entity('scenes')
export class Scene {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 0 })
  order: number;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  draft?: SceneImage;

  @Column({ type: 'jsonb', nullable: true })
  artwork?: SceneImage;

  @Column({
    type: 'enum',
    enum: SceneStatus,
    default: SceneStatus.EMPTY,
  })
  status: SceneStatus;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => Project, (project) => project.scenes, { onDelete: 'CASCADE' })
  project: Project;

  @ManyToOne(() => User)
  uploadedBy: User;

  @OneToMany(() => Comment, (comment) => comment.scene)
  comments: Comment[];

  @OneToMany(() => SceneVersion, (version) => version.scene)
  versions: SceneVersion[];

  @OneToMany(() => Comment, (comment) => comment.scene)
  comments: Comment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
