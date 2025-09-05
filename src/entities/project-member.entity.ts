import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';

export enum ProjectRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

@Entity('project_members')
@Unique(['projectId', 'userId'])
@Index(['projectId', 'userId'])
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @ManyToOne(() => Project, project => project.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ProjectRole,
    default: ProjectRole.VIEWER,
  })
  role: ProjectRole;

  @CreateDateColumn()
  joinedAt: Date;

  @Column({ nullable: true })
  invitedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invitedBy' })
  inviter: User;
}
