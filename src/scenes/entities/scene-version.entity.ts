import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Scene } from './scene.entity';
import { User } from '../../users/entities/user.entity';

@Entity('scene_versions')
export class SceneVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  sceneId: string;

  @ManyToOne(() => Scene, (scene) => scene.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sceneId' })
  scene: Scene;

  @Column('int')
  version: number;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column('jsonb', { nullable: true })
  metadata: {
    size?: number;
    width?: number;
    height?: number;
    format?: string;
    changeDescription?: string;
    [key: string]: any;
  };

  @Column({ nullable: true })
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ nullable: true })
  archivedAt: Date;
}