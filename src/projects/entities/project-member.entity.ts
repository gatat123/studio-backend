import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn, Unique } from 'typeorm';
import { Project } from './project.entity';
import { User } from '../../entities/user.entity';

export enum ProjectRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

@Entity('project_members')
@Unique(['projectId', 'userId'])
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, project => project.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, user => user.projectMemberships, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ProjectRole,
    default: ProjectRole.VIEWER,
  })
  role: ProjectRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}