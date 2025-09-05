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

@Entity('studios')
export class Studio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  inviteCode: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.studios)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @OneToMany(() => StudioMember, (member) => member.studio, { cascade: true })
  members: StudioMember[];

  @OneToMany(() => Project, (project) => project.studio, { cascade: true })
  projects: Project[];
}
