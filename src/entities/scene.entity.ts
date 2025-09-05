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
import { Project } from './project.entity';
import { User } from './user.entity';
import { File } from './file.entity';
import { Comment } from './comment.entity';

export enum SceneStatus {
  EMPTY = 'empty',
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
}

@Entity('scenes')
export class Scene {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Index()
  @Column({ type: 'int' })
  order: number;

  @Column({
    type: 'enum',
    enum: SceneStatus,
    default: SceneStatus.EMPTY,
  })
  status: SceneStatus;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project, (project) => project.scenes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, (user) => user.scenes)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @OneToMany(() => File, (file) => file.scene, { cascade: true })
  files: File[];

  @OneToMany(() => Comment, (comment) => comment.scene)
  comments: Comment[];
}
