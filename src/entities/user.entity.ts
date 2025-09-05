import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Studio } from './studio.entity';
import { StudioMember } from './studio-member.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Project } from './project.entity';
import { Scene } from './scene.entity';
import { Comment } from './comment.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ nullable: true })
  nickname: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationToken: string;

  @Column({ nullable: true })
  @Exclude()
  refreshToken: string;

  @Column({ nullable: true })
  resetPasswordToken: string;

  @Column({ nullable: true })
  resetPasswordExpires: Date;

  @Column({ nullable: true })
  rememberToken: string;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Studio, studio => studio.owner)
  ownedStudios: Studio[];

  @OneToMany(() => StudioMember, member => member.user)
  studioMemberships: StudioMember[];

  @OneToMany(() => ProjectMember, member => member.user)
  projectMemberships: ProjectMember[];

  @OneToMany(() => Project, project => project.createdBy)
  projects: Project[];

  @OneToMany(() => Scene, scene => scene.uploadedBy)
  scenes: Scene[];

  @OneToMany(() => Comment, comment => comment.author)
  comments: Comment[];
}
