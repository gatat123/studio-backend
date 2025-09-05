import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { GenerateInviteCodeDto } from './dto/generate-invite-code.dto';
import { DeleteProjectDto, RestoreProjectDto } from './dto/delete-project.dto';
import { JoinProjectDto, ValidateInviteCodeDto } from './dto/invite-code.dto';
import { ProjectStatus, ProjectCategory } from '../entities/project.entity';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // Create project in a studio
  @Post('studios/:studioId/projects')
  async create(
    @Param('studioId', ParseUUIDPipe) studioId: string,
    @Body() createProjectDto: CreateProjectDto,
    @Request() req: any,
  ) {
    return this.projectsService.create(studioId, createProjectDto, req.user.id);
  }
  // Get all projects in a studio
  @Get('studios/:studioId/projects')
  async findAllByStudio(
    @Param('studioId', ParseUUIDPipe) studioId: string,
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ProjectStatus,
    @Query('category') category?: ProjectCategory,
  ) {
    return this.projectsService.findAllByStudio(studioId, req.user.id, {
      page,
      limit,
      status,
      category,
    });
  }

  // Get single project
  @Get('projects/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.projectsService.findOne(id, req.user.id);
  }

  // Update project
  @Patch('projects/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req: any,
  ) {
    return this.projectsService.update(id, updateProjectDto, req.user.id);
  }
  // Delete project
  @Delete('projects/:id')
  async deleteProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deleteProjectDto: DeleteProjectDto,
    @Request() req: any,
  ) {
    await this.projectsService.deleteProject(id, deleteProjectDto, req.user.id);
    return { message: 'Project deleted successfully' };
  }

  // Soft delete project (deprecated, use DELETE with body)
  @Post('projects/:id/soft-delete')
  async softDelete(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    await this.projectsService.deleteProject(
      id,
      { deleteType: 'soft' as any },
      req.user.id,
    );
    return { message: 'Project soft deleted successfully' };
  }

  // Restore soft-deleted project
  @Post('projects/:id/restore')
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() restoreProjectDto: RestoreProjectDto,
    @Request() req: any,
  ) {
    return this.projectsService.restoreProject(id, restoreProjectDto, req.user.id);
  }

  // Generate invite code
  @Post('projects/:id/invite-code')
  async generateInviteCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() generateInviteCodeDto: GenerateInviteCodeDto,
    @Request() req: any,
  ) {
    return this.projectsService.generateInviteCode(id, generateInviteCodeDto, req.user.id);
  }

  // Join project by invite code
  @Post('projects/join/:code')
  async joinByInviteCode(@Param('code') code: string, @Request() req: any) {
    return this.projectsService.joinByInviteCode(code, req.user.id);
  }

  // Get invite codes for project
  @Get('projects/:id/invite-codes')
  async getInviteCodes(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.projectsService.getInviteCodes(id, req.user.id);
  }

  // Delete invite code
  @Delete('projects/:id/invite-codes/:code')
  async deleteInviteCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('code') code: string,
    @Request() req: any,
  ) {
    await this.projectsService.deleteInviteCode(id, code, req.user.id);
    return { message: 'Invite code deleted successfully' };
  }

  // Validate invite code
  @Get('projects/validate-invite/:code')
  async validateInviteCode(@Param('code') code: string) {
    return this.projectsService.validateInviteCode(code);
  }
}
