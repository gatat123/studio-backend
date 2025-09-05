import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { StudioMember } from './studio-member.entity';
import { Project } from './project.entity';
import { StudioInvite } from './studio-invite.entity';

@Entity('studios')
export class Studio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, (user) => user.ownedStudios, { eager: true })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => StudioMember, (member) => member.studio)
  members: StudioMember[];

  @OneToMany(() => Project, (project) => project.studio)
  projects: Project[];

  @OneToMany(() => StudioInvite, (invite) => invite.studio)
  invites: StudioInvite[];

  @Column({ type: 'jsonb', nullable: true, default: {} })
  settings: Record<string, any>;

  @Column({ name: 'invite_code', type: 'varchar', length: 50, nullable: true, unique: true })
  inviteCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
