import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Studio } from './studio.entity';
import { User } from './user.entity';

export enum InviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum InviteType {
  EMAIL = 'email',
  LINK = 'link',
}

@Entity('studio_invites')
@Index(['code'], { unique: true })
@Index(['studioId', 'email'])
export class StudioInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  studioId: string;

  @ManyToOne(() => Studio, (studio) => studio.invites, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'studioId' })
  studio: Studio;

  @Column({ nullable: true })
  email: string;

  @Column({ unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: InviteType,
    default: InviteType.EMAIL,
  })
  type: InviteType;

  @Column({
    type: 'enum',
    enum: InviteStatus,
    default: InviteStatus.PENDING,
  })
  status: InviteStatus;

  @Column({ default: 'editor' })
  role: string;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ nullable: true })
  maxUses: number;

  @Column({ default: 0 })
  usedCount: number;

  @Column()
  invitedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invitedBy' })
  inviter: User;

  @Column({ nullable: true })
  acceptedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'acceptedBy' })
  acceptedUser: User;

  @Column({ nullable: true })
  acceptedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
