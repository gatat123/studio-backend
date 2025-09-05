import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Studio } from './studio.entity';

export enum StudioRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

@Entity('studio_members')
@Unique(['studioId', 'userId'])
export class StudioMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'studio_id', type: 'uuid' })
  studioId: string;

  @ManyToOne(() => Studio, (studio) => studio.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.studioMemberships, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: StudioRole,
    default: StudioRole.VIEWER,
  })
  role: StudioRole;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @Column({ name: 'invited_by', type: 'uuid', nullable: true })
  invitedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'invited_by' })
  inviter: User;
}
