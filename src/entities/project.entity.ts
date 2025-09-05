import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, DeleteDateColumn, Index } from 'typeorm';
import { Studio } from './studio.entity';
import { User } from './user.entity';
import { Scene } from './scene.entity';
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
  DELETED = 'deleted',
}

export enum DeleteType {
  SOFT = 'soft',
  IMMEDIATE = 'immediate',
  ARCHIVED = 'archived',
}

@Entity('projects')
@Index(['studioId', 'status'])
@Index(['deletedAt'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  studioId: string;

  @ManyToOne(() => Studio, studio => studio.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studioId' })
  studio: Studio;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ProjectCategory,
    default: ProjectCategory.WEBTOON,
  })
  category: ProjectCategory;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  @Column({ nullable: true })
  deadline: Date;

  @Column({ nullable: true })
  thumbnail: string;

  // Soft delete fields
  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ nullable: true })
  deletedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'deletedBy' })
  deletedByUser: User;

  @Column({
    type: 'enum',
    enum: DeleteType,
    nullable: true,
  })
  deleteType: DeleteType;

  @Column({ nullable: true })
  backupUrl: string;

  // Relations
  @OneToMany(() => Scene, scene => scene.project)
  scenes: Scene[];

  @OneToMany(() => ProjectMember, member => member.project)
  members: ProjectMember[];

  @OneToMany(() => InviteCode, inviteCode => inviteCode.project)
  inviteCodes: InviteCode[];

  @Column()
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
