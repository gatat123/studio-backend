import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';

export enum InviteType {
  ONE_TIME = 'one_time',
  PERMANENT = 'permanent',
  LIMITED = 'limited',
}

export enum InviteRole {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  ADMIN = 'admin',
}

@Entity('invite_codes')
@Index(['code'])
@Index(['projectId'])
export class InviteCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  projectId: string;

  @ManyToOne(() => Project, project => project.inviteCodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({
    type: 'enum',
    enum: InviteType,
    default: InviteType.PERMANENT,
  })
  type: InviteType;

  @Column({ nullable: true })
  maxUses: number;

  @Column({ default: 0 })
  usedCount: number;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({
    type: 'enum',
    enum: InviteRole,
    default: InviteRole.VIEWER,
  })
  role: InviteRole;

  @Column()
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @CreateDateColumn()
  createdAt: Date;
}
