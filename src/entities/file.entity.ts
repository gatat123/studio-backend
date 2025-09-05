import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Scene } from './scene.entity';
import { User } from './user.entity';
import { Comment } from './comment.entity';

export enum FileType {
  DRAFT = 'draft',
  ARTWORK = 'artwork',
}

@Entity('files')
@Index(['scene', 'version'])
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  version: number;

  @Column()
  filePath: string;

  @Column({ nullable: true })
  thumbnailPath: string;

  @Column({
    type: 'enum',
    enum: FileType,
    default: FileType.DRAFT,
  })
  fileType: FileType;

  @Column({ type: 'int', nullable: true })
  fileSize: number;

  @Column({ nullable: true })
  mimeType: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Scene, (scene) => scene.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scene_id' })
  scene: Scene;

  @ManyToOne(() => User, (user) => user.files)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @OneToMany(() => Comment, (comment) => comment.file)
  comments: Comment[];
}
