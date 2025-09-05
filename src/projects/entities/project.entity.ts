import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Studio } from '../../studios/entities/studio.entity';
import { Scene } from '../../scenes/entities/scene.entity';
import { ProjectMember } from './project-member.entity';
import { InviteCode } from './invite-code.entity';

export enum ProjectCategory {
  WEBTOON = 'webtoon',
  ILLUSTRATION = 'illustration',
  STORYBOARD = 'storyboard',
  CONCEPT = 'concept',
}

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum DeleteType {
  SOFT = 'soft',
  IMMEDIATE = 'immediate',
  ARCHIVED = 'archived',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'studio_id' })
  studioId: string;

  @ManyToOne(() => Studio, studio => studio.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ProjectCategory,
    default: ProjectCategory.STORYBOARD,
  })
  category: ProjectCategory;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  @Column({ type: 'timestamp', nullable: true })
  deadline: Date;

  @Column({ nullable: true })
  thumbnail: string;

  @OneToMany(() => Scene, scene => scene.project)
  scenes: Scene[];

  @OneToMany(() => ProjectMember, member => member.project)
  members: ProjectMember[];

  @OneToMany(() => InviteCode, inviteCode => inviteCode.project)
  inviteCodes: InviteCode[];

  @Column({ name: 'invite_code', nullable: true })
  inviteCode: string;

  // Soft delete fields
  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date;

  @Column({ name: 'deleted_by', nullable: true })
  deletedBy: string;

  @Column({
    name: 'delete_type',
    type: 'enum',
    enum: DeleteType,
    nullable: true,
  })
  deleteType: DeleteType;

  @Column({ name: 'backup_url', nullable: true })
  backupUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}