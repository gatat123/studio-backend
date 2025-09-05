import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';

export enum SceneStatus {
  EMPTY = 'empty',
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
}

export interface SceneImage {
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
  version: number;
  fileSize?: number;
  width?: number;
  height?: number;
  thumbnails?: Record<string, string>;
  metadata?: {
    format?: string;
    density?: number;
    hasAlpha?: boolean;
    placeholder?: string;
    originalPath?: string;
    [key: string]: any;
  };
}

@Entity('scenes')
@Index(['projectId', 'order'])
export class Scene {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @ManyToOne(() => Project, project => project.scenes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;
  @Column({ default: 0 })
  order: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  // Draft image data
  @Column({ type: 'jsonb', nullable: true })
  draft: SceneImage;

  // Artwork image data  
  @Column({ type: 'jsonb', nullable: true })
  artwork: SceneImage;

  // Version history
  @Column({ type: 'jsonb', default: [] })
  history: SceneImage[];

  @Column({
    type: 'enum',
    enum: SceneStatus,
    default: SceneStatus.EMPTY,
  })
  status: SceneStatus;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
  @Column()
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
