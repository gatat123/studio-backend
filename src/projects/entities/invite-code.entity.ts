import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn, Index } from 'typeorm';
import { Project } from './project.entity';
import { User } from '../../entities/user.entity';

export enum InviteType {
  ONE_TIME = 'one_time',
  PERMANENT = 'permanent',
  LIMITED = 'limited',
}

@Entity('invite_codes')
export class InviteCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  code: string;

  @Column({ name: 'project_id' })
  @Index()
  projectId: string;

  @ManyToOne(() => Project, project => project.inviteCodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({
    type: 'enum',
    enum: InviteType,
    default: InviteType.PERMANENT,
  })
  type: InviteType;

  @Column({ name: 'max_uses', nullable: true })
  maxUses: number;

  @Column({ name: 'used_count', default: 0 })
  usedCount: number;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: 'viewer' })
  role: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}