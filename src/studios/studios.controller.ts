import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StudioRolesGuard } from '../common/guards/studio-roles.guard';
import { StudioRoles } from '../common/decorators/studio-roles.decorator';
import { StudioRole } from '../entities/studio-member.entity';
import { StudiosService } from './studios.service';
import { InviteService } from './invite.service';
import { CreateStudioDto } from './dto/create-studio.dto';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CreateInviteDto, VerifyInviteDto } from './dto/invite.dto';
import { InviteStatus } from '../entities/studio-invite.entity';

@Controller('studios')
@UseGuards(JwtAuthGuard)
export class StudiosController {
  constructor(
    private readonly studiosService: StudiosService,
    private readonly inviteService: InviteService,
  ) {}

  @Post()
  async create(@Body() createStudioDto: CreateStudioDto, @Request() req: any) {
    return this.studiosService.create(createStudioDto, req.user.id);
  }

  @Get()
  async findAll(@Request() req: any, @Query('page') page = 1, @Query('limit') limit = 10) {
    return this.studiosService.findAllByUser(req.user.id, { page, limit });
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const studio = await this.studiosService.findOne(id, req.user.id);
    if (!studio) {
      throw new HttpException('Studio not found', HttpStatus.NOT_FOUND);
    }
    return studio;
  }

  @Patch(':id')
  @UseGuards(StudioRolesGuard)
  @StudioRoles(StudioRole.ADMIN, StudioRole.EDITOR)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStudioDto: UpdateStudioDto,
    @Request() req: any,
  ) {
    return this.studiosService.update(id, updateStudioDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(StudioRolesGuard)
  @StudioRoles(StudioRole.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.studiosService.remove(id, req.user.id);
  }

  // Member management endpoints
  @Get(':id/members')
  async getMembers(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.studiosService.getMembers(id, req.user.id);
  }

  @Post(':id/members/invite')
  @UseGuards(StudioRolesGuard)
  @StudioRoles(StudioRole.ADMIN)
  async inviteMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() inviteMemberDto: InviteMemberDto,
    @Request() req: any,
  ) {
    return this.studiosService.inviteMember(id, inviteMemberDto, req.user.id);
  }

  @Patch(':id/members/:userId/role')
  @UseGuards(StudioRolesGuard)
  @StudioRoles(StudioRole.ADMIN)
  async updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
    @Request() req: any,
  ) {
    return this.studiosService.updateMemberRole(id, userId, updateRoleDto.role, req.user.id);
  }

  @Delete(':id/members/:userId')
  @UseGuards(StudioRolesGuard)
  @StudioRoles(StudioRole.ADMIN)
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any,
  ) {
    return this.studiosService.removeMember(id, userId, req.user.id);
  }

  // Statistics endpoint
  @Get(':id/statistics')
  async getStatistics(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.studiosService.getStatistics(id, req.user.id);
  }

  // Activity log endpoint
  @Get(':id/activities')
  async getActivities(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.studiosService.getActivities(id, req.user.id, { page, limit });
  }

  // Settings endpoints
  @Get(':id/settings')
  async getSettings(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.studiosService.getSettings(id, req.user.id);
  }

  @Put(':id/settings')
  @UseGuards(StudioRolesGuard)
  @StudioRoles(StudioRole.ADMIN)
  async updateSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() settings: Record<string, any>,
    @Request() req: any,
  ) {
    return this.studiosService.updateSettings(id, settings, req.user.id);
  }

  // Invite code endpoints
  @Post(':id/generate-invite-code')
  @UseGuards(StudioRolesGuard)
  @StudioRoles(StudioRole.ADMIN, StudioRole.EDITOR)
  async generateInviteCode(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.studiosService.generateInviteCode(id, req.user.id);
  }

  @Post('join/:code')
  async joinByInviteCode(@Param('code') code: string, @Request() req: any) {
    return this.studiosService.joinByInviteCode(code, req.user.id);
  }

  // New invite system endpoints
  @Post(':id/invites')
  @UseGuards(StudioRolesGuard)
  @StudioRoles(StudioRole.ADMIN, StudioRole.EDITOR)
  async createInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createInviteDto: CreateInviteDto,
    @Request() req: any,
  ) {
    return this.inviteService.createInvite(id, req.user.id, createInviteDto);
  }

  @Post(':id/invites/link')
  @UseGuards(StudioRolesGuard)
  @StudioRoles(StudioRole.ADMIN, StudioRole.EDITOR)
  async createLinkInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createInviteDto: CreateInviteDto,
    @Request() req: any,
  ) {
    return this.inviteService.createLinkInvite(id, req.user.id, createInviteDto);
  }

  @Get(':id/invites')
  @UseGuards(StudioRolesGuard)
  @StudioRoles(StudioRole.ADMIN, StudioRole.EDITOR)
  async getInvites(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status?: InviteStatus,
  ) {
    return this.inviteService.getStudioInvites(id, status);
  }

  @Post('invites/verify')
  async verifyInvite(@Body() dto: VerifyInviteDto, @Request() req: any) {
    return this.inviteService.verifyAndAcceptInvite(dto, req.user.id);
  }

  @Get('invites/:code')
  async getInviteInfo(@Param('code') code: string) {
    return this.inviteService.getInviteByCode(code);
  }

  @Post(':id/invites/:inviteId/resend')
  @UseGuards(StudioRolesGuard)
  @StudioRoles(StudioRole.ADMIN)
  async resendInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @Request() req: any,
  ) {
    return this.inviteService.resendInvite(inviteId, req.user.id);
  }

  @Delete(':id/invites/:inviteId')
  @UseGuards(StudioRolesGuard)
  @StudioRoles(StudioRole.ADMIN)
  async cancelInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @Request() req: any,
  ) {
    return this.inviteService.cancelInvite(inviteId, req.user.id);
  }
}
