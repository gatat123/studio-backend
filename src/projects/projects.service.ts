import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Project, ProjectStatus, ProjectCategory, DeleteType } from '../entities/project.entity';
import { ProjectMember, ProjectRole } from '../entities/project-member.entity';
import { InviteCode, InviteType, InviteRole } from '../entities/invite-code.entity';
import { Studio } from '../entities/studio.entity';
import { StudioMember } from '../entities/studio-member.entity';
import { User } from '../entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { GenerateInviteCodeDto } from './dto/generate-invite-code.dto';
import { DeleteProjectDto, RestoreProjectDto } from './dto/delete-project.dto';
import { JoinProjectDto, ValidateInviteCodeDto } from './dto/invite-code.dto';
import * as crypto from 'crypto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(InviteCode)
    private inviteCodeRepository: Repository<InviteCode>,
    @InjectRepository(Studio)
    private studioRepository: Repository<Studio>,
    @InjectRepository(StudioMember)    private studioMemberRepository: Repository<StudioMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Create a new project
  async create(studioId: string, createProjectDto: CreateProjectDto, userId: string): Promise<Project> {
    // Check if user is member of the studio
    const studioMember = await this.studioMemberRepository.findOne({
      where: { studioId, userId },
    });

    if (!studioMember) {
      throw new ForbiddenException('You are not a member of this studio');
    }

    // Only admins and editors can create projects
    if (studioMember.role === 'viewer') {
      throw new ForbiddenException('Viewers cannot create projects');
    }

    const project = this.projectRepository.create({
      ...createProjectDto,
      studioId,
      createdBy: userId,
    });

    const savedProject = await this.projectRepository.save(project);

    // Add creator as admin
    await this.projectMemberRepository.save({
      projectId: savedProject.id,      userId,
      role: ProjectRole.ADMIN,
    });

    return savedProject;
  }

  // Get all projects in a studio
  async findAllByStudio(
    studioId: string,
    userId: string,
    options: { page?: number; limit?: number; status?: ProjectStatus; category?: ProjectCategory } = {},
  ): Promise<{ projects: Project[]; total: number }> {
    // Check if user is member of the studio
    const studioMember = await this.studioMemberRepository.findOne({
      where: { studioId, userId },
    });

    if (!studioMember) {
      throw new ForbiddenException('You are not a member of this studio');
    }

    const { page = 1, limit = 10, status, category } = options;
    const skip = (page - 1) * limit;

    const query = this.projectRepository.createQueryBuilder('project')
      .where('project.studioId = :studioId', { studioId })
      .andWhere('project.deletedAt IS NULL');
    if (status) {
      query.andWhere('project.status = :status', { status });
    }

    if (category) {
      query.andWhere('project.category = :category', { category });
    }

    const [projects, total] = await query
      .skip(skip)
      .take(limit)
      .orderBy('project.createdAt', 'DESC')
      .getManyAndCount();

    return { projects, total };
  }

  // Get a single project
  async findOne(projectId: string, userId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, deletedAt: IsNull() },
      relations: ['studio', 'creator'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
    // Check if user has access to the project
    await this.checkProjectAccess(projectId, userId);

    return project;
  }

  // Update a project
  async update(projectId: string, updateProjectDto: UpdateProjectDto, userId: string): Promise<Project> {
    await this.checkProjectAccess(projectId, userId, ProjectRole.EDITOR);

    const project = await this.projectRepository.findOne({
      where: { id: projectId, deletedAt: IsNull() },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    Object.assign(project, updateProjectDto);
    return await this.projectRepository.save(project);
  }

  // Soft delete a project
  async softDelete(projectId: string, userId: string): Promise<Project> {
    await this.checkProjectAccess(projectId, userId, ProjectRole.ADMIN);
    const project = await this.projectRepository.findOne({
      where: { id: projectId, deletedAt: IsNull() },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    project.deletedAt = new Date();
    project.deletedBy = userId;
    project.deleteType = DeleteType.SOFT;
    project.status = ProjectStatus.DELETED;

    return await this.projectRepository.save(project);
  }

  // Permanently delete a project
  async hardDelete(projectId: string, userId: string): Promise<void> {
    await this.checkProjectAccess(projectId, userId, ProjectRole.ADMIN);

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
    // TODO: Create backup before deletion
    await this.projectRepository.remove(project);
  }

  // Restore a soft-deleted project
  async restore(projectId: string, userId: string): Promise<Project> {
    await this.checkProjectAccess(projectId, userId, ProjectRole.ADMIN);

    const project = await this.projectRepository.findOne({
      where: { id: projectId, deletedAt: Not(IsNull()) },
    });

    if (!project) {
      throw new NotFoundException('Deleted project not found');
    }

    project.deletedAt = null;
    project.deletedBy = null;
    project.deleteType = null;
    project.status = ProjectStatus.IN_PROGRESS;

    return await this.projectRepository.save(project);
  }

  // Generate invite code
  async generateInviteCode(    projectId: string,
    generateInviteCodeDto: GenerateInviteCodeDto,
    userId: string,
  ): Promise<InviteCode> {
    await this.checkProjectAccess(projectId, userId, ProjectRole.EDITOR);

    // Generate unique code
    let code: string;
    let isUnique = false;
    
    while (!isUnique) {
      code = this.generateCode();
      const existing = await this.inviteCodeRepository.findOne({ where: { code } });
      if (!existing) {
        isUnique = true;
      }
    }

    const inviteCode = this.inviteCodeRepository.create({
      code,
      projectId,
      ...generateInviteCodeDto,
      createdBy: userId,
    });

    return await this.inviteCodeRepository.save(inviteCode);
  }

  // Join project by invite code
  async joinByInviteCode(code: string, userId: string): Promise<Project> {    const inviteCode = await this.inviteCodeRepository.findOne({
      where: { code },
      relations: ['project'],
    });

    if (!inviteCode) {
      throw new NotFoundException('Invalid invite code');
    }

    // Check if invite code is expired
    if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
      throw new BadRequestException('Invite code has expired');
    }

    // Check if invite code has reached max uses
    if (inviteCode.maxUses && inviteCode.usedCount >= inviteCode.maxUses) {
      throw new BadRequestException('Invite code has reached maximum uses');
    }

    // Check if user is already a member
    const existingMember = await this.projectMemberRepository.findOne({
      where: { projectId: inviteCode.projectId, userId },
    });

    if (existingMember) {
      throw new ConflictException('You are already a member of this project');
    }

    // Add user as project member
    await this.projectMemberRepository.save({      projectId: inviteCode.projectId,
      userId,
      role: inviteCode.role as unknown as ProjectRole,
      invitedBy: inviteCode.createdBy,
    });

    // Update invite code usage
    inviteCode.usedCount++;
    
    // Delete one-time invite codes after use
    if (inviteCode.type === InviteType.ONE_TIME) {
      await this.inviteCodeRepository.remove(inviteCode);
    } else {
      await this.inviteCodeRepository.save(inviteCode);
    }

    return inviteCode.project;
  }

  // Helper: Check project access
  private async checkProjectAccess(
    projectId: string,
    userId: string,
    requiredRole?: ProjectRole,
  ): Promise<ProjectMember> {
    const member = await this.projectMemberRepository.findOne({
      where: { projectId, userId },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this project');
    }
    if (requiredRole) {
      const roleHierarchy: Record<ProjectRole, number> = {
        [ProjectRole.VIEWER]: 0,
        [ProjectRole.EDITOR]: 1,
        [ProjectRole.ADMIN]: 2,
      };

      if (roleHierarchy[member.role] < roleHierarchy[requiredRole]) {
        throw new ForbiddenException(`Required role: ${requiredRole}. Your role: ${member.role}`);
      }
    }

    return member;
  }

  // Delete project (soft or immediate)
  async deleteProject(
    projectId: string,
    deleteProjectDto: DeleteProjectDto,
    userId: string,
  ): Promise<void> {
    const project = await this.findOne(projectId);
    
    // Check if user has admin rights
    await this.checkProjectAccess(projectId, userId, ProjectRole.ADMIN);

    if (deleteProjectDto.deleteType === 'soft') {
      // Soft delete - mark as deleted
      project.deletedAt = new Date();
      project.deletedBy = userId;
      project.deleteType = DeleteType.SOFT;
      project.status = ProjectStatus.DELETED;
      
      await this.projectRepository.save(project);
      
      // TODO: Schedule deletion after 30 days
      // This would typically use a job queue like Bull
    } else if (deleteProjectDto.deleteType === 'immediate') {
      // Create backup if requested
      if (deleteProjectDto.createBackup) {
        await this.createProjectBackup(project);
      }
      
      // Immediate delete
      await this.projectRepository.remove(project);
    } else if (deleteProjectDto.deleteType === 'archive') {
      // Archive the project
      project.deletedAt = new Date();
      project.deletedBy = userId;
      project.deleteType = DeleteType.ARCHIVED;
      project.status = ProjectStatus.ARCHIVED;
      
      await this.projectRepository.save(project);
    }
  }

  // Restore soft-deleted project
  async restoreProject(
    projectId: string,
    restoreProjectDto: RestoreProjectDto,
    userId: string,
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, deletedAt: Not(IsNull()) },
    });

    if (!project) {
      throw new NotFoundException('Project not found or not deleted');
    }

    // Check if user has admin rights
    await this.checkProjectAccess(projectId, userId, ProjectRole.ADMIN);

    // Restore the project
    project.deletedAt = null;
    project.deletedBy = null;
    project.deleteType = null;
    project.status = ProjectStatus.PLANNING;

    return await this.projectRepository.save(project);
  }

  // Create project backup
  private async createProjectBackup(project: Project): Promise<string> {
    // TODO: Implement actual backup logic
    // This would typically:
    // 1. Export all project data to JSON
    // 2. Include all scenes, comments, etc.
    // 3. Upload to S3 or other storage
    // 4. Return the backup URL
    
    const backupData = {
      project,
      timestamp: new Date().toISOString(),
      // Add more data as needed
    };
    
    // For now, just return a placeholder URL
    return `backup://${project.id}/${Date.now()}.json`;
  }

  // List invite codes for a project
  async getInviteCodes(projectId: string, userId: string): Promise<InviteCode[]> {
    // Check if user has access
    await this.checkProjectAccess(projectId, userId, ProjectRole.ADMIN);

    return await this.inviteCodeRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  // Delete invite code
  async deleteInviteCode(projectId: string, code: string, userId: string): Promise<void> {
    // Check if user has admin access
    await this.checkProjectAccess(projectId, userId, ProjectRole.ADMIN);

    const inviteCode = await this.inviteCodeRepository.findOne({
      where: { projectId, code },
    });

    if (!inviteCode) {
      throw new NotFoundException('Invite code not found');
    }

    await this.inviteCodeRepository.remove(inviteCode);
  }

  // Validate invite code
  async validateInviteCode(code: string): Promise<any> {
    const inviteCode = await this.inviteCodeRepository.findOne({
      where: { code },
      relations: ['project'],
    });

    if (!inviteCode) {
      throw new NotFoundException('Invalid invite code');
    }

    // Check if expired
    if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
      throw new BadRequestException('Invite code has expired');
    }

    // Check if max uses reached
    if (inviteCode.maxUses && inviteCode.usedCount >= inviteCode.maxUses) {
      throw new BadRequestException('Invite code has reached maximum uses');
    }

    return {
      valid: true,
      project: {
        id: inviteCode.project.id,
        title: inviteCode.project.title,
        description: inviteCode.project.description,
      },
      role: inviteCode.role,
      expiresAt: inviteCode.expiresAt,
    };
  }

  // Helper: Generate unique invite code
  private generateCode(): string {
    const prefix = 'PRJ';
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${random.slice(0, 4)}-${random.slice(4)}`;
  }
}
