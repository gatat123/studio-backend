import { 
  Injectable, 
  NotFoundException, 
  ConflictException,
  ForbiddenException,
  BadRequestException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Studio } from '../entities/studio.entity';
import { StudioMember, StudioRole } from '../entities/studio-member.entity';
import { User } from '../entities/user.entity';
import { CreateStudioDto } from './dto/create-studio.dto';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { EmailService } from '../common/services/email.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { ActivityAction, ActivityTarget } from '../entities/activity-log.entity';
import { nanoid } from 'nanoid';

@Injectable()
export class StudiosService {
  constructor(
    @InjectRepository(Studio)
    private studiosRepository: Repository<Studio>,
    @InjectRepository(StudioMember)
    private studioMembersRepository: Repository<StudioMember>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource,
    private emailService: EmailService,
    private activityLogService: ActivityLogService,
  ) {}

  async create(createStudioDto: CreateStudioDto, userId: string): Promise<Studio> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create studio
      const studio = this.studiosRepository.create({
        ...createStudioDto,
        ownerId: userId,
      });
      const savedStudio = await queryRunner.manager.save(studio);

      // Add owner as admin member
      const member = this.studioMembersRepository.create({
        studioId: savedStudio.id,
        userId,
        role: StudioRole.ADMIN,
      });
      await queryRunner.manager.save(member);

      await queryRunner.commitTransaction();
      return savedStudio;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllByUser(userId: string, pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [studios, total] = await this.studioMembersRepository.findAndCount({
      where: { userId },
      relations: ['studio', 'studio.owner'],
      skip,
      take: limit,
    });

    return {
      data: studios.map((member) => ({
        ...member.studio,
        role: member.role,
      })),
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId: string): Promise<Studio> {
    const studio = await this.studiosRepository.findOne({
      where: { id },
      relations: ['owner', 'members', 'members.user'],
    });

    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    // Check if user has access
    await this.checkAccess(id, userId, StudioRole.VIEWER);

    return studio;
  }

  async update(id: string, updateStudioDto: UpdateStudioDto, userId: string): Promise<Studio> {
    await this.checkAccess(id, userId, StudioRole.ADMIN);

    await this.studiosRepository.update(id, updateStudioDto);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const studio = await this.findOne(id, userId);
    
    // Check if user is owner
    if (studio.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can delete the studio');
    }

    await this.studiosRepository.delete(id);
  }

  async getMembers(studioId: string, userId: string) {
    await this.checkAccess(studioId, userId, StudioRole.VIEWER);

    return this.studioMembersRepository.find({
      where: { studioId },
      relations: ['user', 'inviter'],
    });
  }

  async inviteMember(studioId: string, inviteMemberDto: InviteMemberDto, inviterId: string) {
    await this.checkAccess(studioId, inviterId, StudioRole.ADMIN);

    const { email, role } = inviteMemberDto;

    // Check if user exists
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      // Send invitation email
      await this.emailService.sendStudioInvitation(email, studioId, inviterId);
      return { message: 'Invitation sent to email' };
    }

    // Check if already member
    const existingMember = await this.studioMembersRepository.findOne({
      where: { studioId, userId: user.id },
    });
    if (existingMember) {
      throw new ConflictException('User is already a member');
    }

    // Add as member
    const member = this.studioMembersRepository.create({
      studioId,
      userId: user.id,
      role: role || StudioRole.VIEWER,
      invitedBy: inviterId,
    });
    
    await this.studioMembersRepository.save(member);
    return member;
  }

  async updateMemberRole(
    studioId: string, 
    userId: string, 
    newRole: StudioRole, 
    requesterId: string
  ): Promise<StudioMember> {
    await this.checkAccess(studioId, requesterId, StudioRole.ADMIN);

    const member = await this.studioMembersRepository.findOne({
      where: { studioId, userId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Can't change owner's role
    const studio = await this.studiosRepository.findOne({ where: { id: studioId } });
    if (!studio) {
      throw new NotFoundException('Studio not found');
    }
    if (studio.ownerId === userId) {
      throw new BadRequestException('Cannot change owner role');
    }

    member.role = newRole;
    return this.studioMembersRepository.save(member);
  }

  async removeMember(studioId: string, userId: string, requesterId: string): Promise<void> {
    await this.checkAccess(studioId, requesterId, StudioRole.ADMIN);

    // Can't remove owner
    const studio = await this.studiosRepository.findOne({ where: { id: studioId } });
    if (!studio) {
      throw new NotFoundException('Studio not found');
    }
    if (studio.ownerId === userId) {
      throw new BadRequestException('Cannot remove studio owner');
    }

    // User can remove themselves
    if (userId !== requesterId) {
      await this.checkAccess(studioId, requesterId, StudioRole.ADMIN);
    }

    await this.studioMembersRepository.delete({ studioId, userId });
  }

  async getStatistics(studioId: string, userId: string) {
    await this.checkAccess(studioId, userId, StudioRole.VIEWER);

    const studio = await this.studiosRepository.findOne({
      where: { id: studioId },
      relations: ['projects', 'members'],
    });

    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    const projectStatusCount = await this.dataSource.query(`
      SELECT status, COUNT(*) as count
      FROM projects
      WHERE "studioId" = $1
      GROUP BY status
    `, [studioId]);

    return {
      totalMembers: studio.members?.length || 0,
      totalProjects: studio.projects?.length || 0,
      projectsByStatus: projectStatusCount,
      createdAt: studio.createdAt,
    };
  }

  async getActivities(studioId: string, userId: string, pagination: { page: number; limit: number }) {
    await this.checkAccess(studioId, userId, StudioRole.VIEWER);

    // This will be implemented when we have the ActivityLog entity
    return {
      data: [],
      total: 0,
      page: pagination.page,
      lastPage: 1,
    };
  }

  async getSettings(studioId: string, userId: string) {
    await this.checkAccess(studioId, userId, StudioRole.VIEWER);

    const studio = await this.studiosRepository.findOne({ 
      where: { id: studioId },
      select: ['settings'] 
    });

    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    return studio.settings || {};
  }

  async updateSettings(studioId: string, settings: Record<string, any>, userId: string) {
    await this.checkAccess(studioId, userId, StudioRole.ADMIN);

    await this.studiosRepository.update(studioId, { settings });
    return settings;
  }

  async generateInviteCode(studioId: string, userId: string): Promise<string> {
    await this.checkAccess(studioId, userId, StudioRole.ADMIN);

    const inviteCode = `STU-${nanoid(8).toUpperCase()}`;
    await this.studiosRepository.update(studioId, { inviteCode });
    
    return inviteCode;
  }

  async joinByInviteCode(code: string, userId: string): Promise<StudioMember> {
    const studio = await this.studiosRepository.findOne({
      where: { inviteCode: code },
    });

    if (!studio) {
      throw new NotFoundException('Invalid invite code');
    }

    // Check if already member
    const existingMember = await this.studioMembersRepository.findOne({
      where: { studioId: studio.id, userId },
    });

    if (existingMember) {
      throw new ConflictException('You are already a member of this studio');
    }

    // Add as viewer by default
    const member = this.studioMembersRepository.create({
      studioId: studio.id,
      userId,
      role: StudioRole.VIEWER,
    });

    return this.studioMembersRepository.save(member);
  }

  private async checkAccess(
    studioId: string,
    userId: string,
    requiredRole: StudioRole,
  ): Promise<void> {
    const member = await this.studioMembersRepository.findOne({
      where: { studioId, userId },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this studio');
    }

    const roleHierarchy = {
      [StudioRole.VIEWER]: 1,
      [StudioRole.EDITOR]: 2,
      [StudioRole.ADMIN]: 3,
    };

    if (roleHierarchy[member.role] < roleHierarchy[requiredRole]) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  async getStatistics(studioId: string, userId: string) {
    await this.checkAccess(studioId, userId, StudioRole.VIEWER);

    const studio = await this.studiosRepository.findOne({
      where: { id: studioId },
      relations: ['members', 'projects'],
    });

    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    // Get project statistics
    const projectsCount = studio.projects?.length || 0;
    const activeProjects = studio.projects?.filter(p => p.status === 'in_progress').length || 0;
    const completedProjects = studio.projects?.filter(p => p.status === 'completed').length || 0;

    // Get member statistics
    const membersCount = studio.members?.length || 0;
    const adminsCount = studio.members?.filter(m => m.role === StudioRole.ADMIN).length || 0;
    const editorsCount = studio.members?.filter(m => m.role === StudioRole.EDITOR).length || 0;
    const viewersCount = studio.members?.filter(m => m.role === StudioRole.VIEWER).length || 0;

    // Get recent activities
    const recentActivities = await this.activityLogService.getRecentActivities(studioId, 5);

    return {
      projects: {
        total: projectsCount,
        active: activeProjects,
        completed: completedProjects,
        planning: studio.projects?.filter(p => p.status === 'planning').length || 0,
        review: studio.projects?.filter(p => p.status === 'review').length || 0,
      },
      members: {
        total: membersCount,
        admins: adminsCount,
        editors: editorsCount,
        viewers: viewersCount,
      },
      recentActivities: recentActivities,
      createdAt: studio.createdAt,
      updatedAt: studio.updatedAt,
    };
  }

  async getActivities(studioId: string, userId: string, options: { page: number; limit: number }) {
    await this.checkAccess(studioId, userId, StudioRole.VIEWER);
    return this.activityLogService.getStudioActivities(studioId, options);
  }

  async getSettings(studioId: string, userId: string) {
    await this.checkAccess(studioId, userId, StudioRole.VIEWER);
    
    const studio = await this.studiosRepository.findOne({
      where: { id: studioId },
    });

    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    return studio.settings || {};
  }

  async updateSettings(studioId: string, settings: Record<string, any>, userId: string) {
    await this.checkAccess(studioId, userId, StudioRole.ADMIN);

    const studio = await this.studiosRepository.findOne({
      where: { id: studioId },
    });

    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    studio.settings = {
      ...studio.settings,
      ...settings,
    };

    const updated = await this.studiosRepository.save(studio);

    // Log activity
    await this.activityLogService.log({
      studioId,
      userId,
      action: ActivityAction.STUDIO_UPDATED,
      target: ActivityTarget.STUDIO,
      targetId: studioId,
      details: 'Settings updated',
      metadata: { settings },
    });

    return updated.settings;
  }
}
