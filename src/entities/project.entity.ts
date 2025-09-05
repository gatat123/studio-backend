import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Studio } from './studio.entity';
import { Scene } from './scene.entity';
import { ProjectMember } from './project-member.entity';
import { InviteCode } from './invite-code.entity';

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum ProjectCategory {
  WEBTOON = 'webtoon',
  ILLUSTRATION = 'illustration',
  STORYBOARD = 'storyboard',
  CONCEPT = 'concept',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  @Index()
  @Column({
    type: 'enum',
    enum: ProjectCategory,
    default: ProjectCategory.STORYBOARD,
  })
  category: ProjectCategory;

  @Column({ nullable: true })
  deadline: Date;

  @Column({ nullable: true })
  thumbnail: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ nullable: true })
  deletedBy: string;

  @Column({ nullable: true })
  backupUrl: string;

  // Relations
  @ManyToOne(() => Studio, (studio) => studio.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @OneToMany(() => Scene, (scene) => scene.project, { cascade: true })
  scenes: Scene[];

  @OneToMany(() => ProjectMember, (member) => member.project, { cascade: true })
  collaborators: ProjectMember[];

  @OneToMany(() => InviteCode, (inviteCode) => inviteCode.project)
  inviteCodes: InviteCode[];
}
