import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Studio } from './studio.entity';

export enum StudioRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

@Entity('studio_members')
@Index(['studio', 'user'], { unique: true }) // Composite unique index
export class StudioMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: StudioRole,
    default: StudioRole.VIEWER,
  })
  role: StudioRole;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Studio, (studio) => studio.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @ManyToOne(() => User, (user) => user.studioMemberships)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
