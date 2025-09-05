import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  OneToMany,
  Index,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Studio } from './studio.entity';
import { StudioMember } from './studio-member.entity';
import { Scene } from './scene.entity';
import { File } from './file.entity';
import { Comment } from './comment.entity';
import { Notification } from './notification.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Index()
  @Column({ nullable: true })
  nickname: string;

  @Column({ nullable: true })
  avatar: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Studio, (studio) => studio.createdBy)
  studios: Studio[];

  @OneToMany(() => StudioMember, (member) => member.user)
  studioMemberships: StudioMember[];

  @OneToMany(() => Scene, (scene) => scene.createdBy)
  scenes: Scene[];

  @OneToMany(() => File, (file) => file.createdBy)
  files: File[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  // Hooks
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
