import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Scene, SceneStatus, SceneImage } from './entities/scene.entity';
import { Project } from '../projects/entities/project.entity';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { BulkUploadDto } from './dto/bulk-upload.dto';
import { UpdateSceneOrderDto } from './dto/update-scene-order.dto';
import { SceneVersion } from './entities/scene-version.entity';
import { SceneThumbnailService } from './scene-thumbnail.service';

@Injectable()
export class ScenesService {
  constructor(
    @InjectRepository(Scene)
    private scenesRepository: Repository<Scene>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(SceneVersion)
    private sceneVersionsRepository: Repository<SceneVersion>,
    private thumbnailService: SceneThumbnailService,
  ) {}

  async create(
    projectId: string,
    createSceneDto: CreateSceneDto,
    userId: string,
  ): Promise<Scene> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['studio', 'studio.members', 'collaborators'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check permission
    const hasPermission = await this.checkProjectPermission(
      project,
      userId,
      ['owner', 'admin', 'editor'],
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to create scenes');
    }

    // Get the current max order
    const maxOrderScene = await this.scenesRepository.findOne({
      where: { project: { id: projectId } },
      order: { order: 'DESC' },
    });

    const newOrder = maxOrderScene ? maxOrderScene.order + 1 : 0;

    const scene = this.scenesRepository.create({
      ...createSceneDto,
      project,
      order: newOrder,
      uploadedBy: { id: userId },
    });

    return this.scenesRepository.save(scene);
  }

  async findAll(projectId: string, userId: string): Promise<Scene[]> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['studio', 'studio.members', 'collaborators'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check permission (viewers and above can see scenes)
    const hasPermission = await this.checkProjectPermission(
      project,
      userId,
      ['owner', 'admin', 'editor', 'viewer'],
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to view scenes');
    }

    return this.scenesRepository.find({
      where: { project: { id: projectId } },
      relations: ['uploadedBy', 'comments', 'versions'],
      order: { order: 'ASC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Scene> {
    const scene = await this.scenesRepository.findOne({
      where: { id },
      relations: [
        'project',
        'project.studio',
        'project.studio.members',
        'project.collaborators',
        'uploadedBy',
        'comments',
        'comments.author',
        'versions',
      ],
    });

    if (!scene) {
      throw new NotFoundException('Scene not found');
    }

    // Check permission
    const hasPermission = await this.checkProjectPermission(
      scene.project,
      userId,
      ['owner', 'admin', 'editor', 'viewer'],
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to view this scene');
    }

    return scene;
  }

  async update(
    id: string,
    updateSceneDto: UpdateSceneDto,
    userId: string,
  ): Promise<Scene> {
    const scene = await this.findOne(id, userId);

    // Check edit permission
    const hasEditPermission = await this.checkProjectPermission(
      scene.project,
      userId,
      ['owner', 'admin', 'editor'],
    );

    if (!hasEditPermission) {
      throw new ForbiddenException('You do not have permission to edit this scene');
    }

    // Save version history if image is being updated
    if (updateSceneDto.draft || updateSceneDto.artwork) {
      await this.saveVersion(scene, userId);
    }

    Object.assign(scene, updateSceneDto);
    return this.scenesRepository.save(scene);
  }

  async updateOrder(
    projectId: string,
    updateOrderDto: UpdateSceneOrderDto,
    userId: string,
  ): Promise<Scene[]> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['studio', 'studio.members', 'collaborators'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check permission
    const hasPermission = await this.checkProjectPermission(
      project,
      userId,
      ['owner', 'admin', 'editor'],
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to reorder scenes');
    }

    // Use transaction for safe order updates
    const queryRunner = this.scenesRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update scene orders
      const updates = updateOrderDto.scenes.map(async (sceneOrder) => {
        await queryRunner.manager.update(
          Scene,
          { id: sceneOrder.id, project: { id: projectId } },
          { order: sceneOrder.order },
        );
      });

      await Promise.all(updates);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Failed to update scene order');
    } finally {
      await queryRunner.release();
    }

    return this.findAll(projectId, userId);
  }

  async bulkUpload(
    projectId: string,
    bulkUploadDto: BulkUploadDto,
    userId: string,
  ): Promise<Scene[]> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['studio', 'studio.members', 'collaborators'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check permission
    const hasPermission = await this.checkProjectPermission(
      project,
      userId,
      ['owner', 'admin', 'editor'],
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to upload scenes');
    }

    // Get the current max order
    const maxOrderScene = await this.scenesRepository.findOne({
      where: { project: { id: projectId } },
      order: { order: 'DESC' },
    });

    let currentOrder = maxOrderScene ? maxOrderScene.order + 1 : 0;

    const scenes: Scene[] = [];

    for (const sceneData of bulkUploadDto.scenes) {
      const scene = this.scenesRepository.create({
        title: sceneData.title || `Scene ${currentOrder + 1}`,
        description: sceneData.description,
        order: currentOrder++,
        draft: sceneData.draft,
        artwork: sceneData.artwork,
        project,
        uploadedBy: { id: userId },
        status: sceneData.draft ? SceneStatus.DRAFT : SceneStatus.EMPTY,
      });

      scenes.push(scene);
    }

    return this.scenesRepository.save(scenes);
  }

  async remove(id: string, userId: string): Promise<void> {
    const scene = await this.findOne(id, userId);

    // Check permission
    const hasPermission = await this.checkProjectPermission(
      scene.project,
      userId,
      ['owner', 'admin'],
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to delete this scene');
    }

    // Reorder remaining scenes
    await this.scenesRepository
      .createQueryBuilder()
      .update(Scene)
      .set({ order: () => 'order - 1' })
      .where('project.id = :projectId AND order > :order', {
        projectId: scene.project.id,
        order: scene.order,
      })
      .execute();

    await this.scenesRepository.remove(scene);
  }

  async bulkDelete(
    projectId: string,
    sceneIds: string[],
    userId: string,
  ): Promise<void> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['studio', 'studio.members', 'collaborators'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check permission
    const hasPermission = await this.checkProjectPermission(
      project,
      userId,
      ['owner', 'admin'],
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to delete scenes');
    }

    // Get scenes to delete
    const scenes = await this.scenesRepository.find({
      where: {
        id: In(sceneIds),
        project: { id: projectId },
      },
      order: { order: 'ASC' },
    });

    // Delete scenes
    await this.scenesRepository.remove(scenes);

    // Reorder remaining scenes
    const remainingScenes = await this.scenesRepository.find({
      where: { project: { id: projectId } },
      order: { order: 'ASC' },
    });

    for (let i = 0; i < remainingScenes.length; i++) {
      remainingScenes[i].order = i;
    }

    await this.scenesRepository.save(remainingScenes);
  }

  async getVersions(sceneId: string, userId: string): Promise<SceneVersion[]> {
    const scene = await this.findOne(sceneId, userId);

    return this.sceneVersionsRepository.find({
      where: { scene: { id: scene.id } },
      relations: ['uploadedBy'],
      order: { version: 'DESC' },
    });
  }

  private async saveVersion(scene: Scene, userId: string): Promise<void> {
    const lastVersion = await this.sceneVersionsRepository.findOne({
      where: { scene: { id: scene.id } },
      order: { version: 'DESC' },
    });

    const newVersion = lastVersion ? lastVersion.version + 1 : 1;

    const version = this.sceneVersionsRepository.create({
      scene,
      version: newVersion,
      draft: scene.draft,
      artwork: scene.artwork,
      uploadedBy: { id: userId },
    });

    await this.sceneVersionsRepository.save(version);
  }

  private async checkProjectPermission(
    project: Project,
    userId: string,
    allowedRoles: string[],
  ): Promise<boolean> {
    // Check if user is studio owner
    if (project.studio.owner.id === userId && allowedRoles.includes('owner')) {
      return true;
    }

    // Check studio members
    const member = project.studio.members?.find((m) => m.user.id === userId);
    if (member && allowedRoles.includes(member.role)) {
      return true;
    }

    // Check project collaborators
    const collaborator = project.collaborators?.find((c) => c.user.id === userId);
    if (collaborator && allowedRoles.includes(collaborator.role)) {
      return true;
    }

    return false;
  }
}
  async bulkMove(
    projectId: string,
    sceneIds: string[],
    targetProjectId: string,
    userId: string,
  ): Promise<Scene[]> {
    // Check source project permission
    const sourceProject = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['studio', 'studio.members', 'collaborators'],
    });

    if (!sourceProject) {
      throw new NotFoundException('Source project not found');
    }

    const hasSourcePermission = await this.checkProjectPermission(
      sourceProject,
      userId,
      ['owner', 'admin', 'editor'],
    );

    if (!hasSourcePermission) {
      throw new ForbiddenException('You do not have permission to move scenes from this project');
    }

    // Check target project permission
    const targetProject = await this.projectsRepository.findOne({
      where: { id: targetProjectId },
      relations: ['studio', 'studio.members', 'collaborators'],
    });

    if (!targetProject) {
      throw new NotFoundException('Target project not found');
    }

    const hasTargetPermission = await this.checkProjectPermission(
      targetProject,
      userId,
      ['owner', 'admin', 'editor'],
    );

    if (!hasTargetPermission) {
      throw new ForbiddenException('You do not have permission to add scenes to the target project');
    }

    // Use transaction for safe move operation
    const queryRunner = this.scenesRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get scenes to move
      const scenesToMove = await queryRunner.manager.find(Scene, {
        where: {
          id: In(sceneIds),
          project: { id: projectId },
        },
      });

      // Get current max order in target project
      const maxOrderScene = await queryRunner.manager.findOne(Scene, {
        where: { project: { id: targetProjectId } },
        order: { order: 'DESC' },
      });

      let currentOrder = maxOrderScene ? maxOrderScene.order + 1 : 0;

      // Move scenes to target project
      for (const scene of scenesToMove) {
        scene.project = targetProject;
        scene.order = currentOrder++;
        await queryRunner.manager.save(scene);
      }

      // Reorder remaining scenes in source project
      const remainingScenes = await queryRunner.manager.find(Scene, {
        where: { project: { id: projectId } },
        order: { order: 'ASC' },
      });

      for (let i = 0; i < remainingScenes.length; i++) {
        remainingScenes[i].order = i;
      }

      await queryRunner.manager.save(remainingScenes);
      await queryRunner.commitTransaction();

      return scenesToMove;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Failed to move scenes');
    } finally {
      await queryRunner.release();
    }
  }

  async bulkSelect(
    projectId: string,
    sceneIds: string[],
    userId: string,
  ): Promise<Scene[]> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['studio', 'studio.members', 'collaborators'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check permission
    const hasPermission = await this.checkProjectPermission(
      project,
      userId,
      ['owner', 'admin', 'editor', 'viewer'],
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to view scenes');
    }

    return this.scenesRepository.find({
      where: {
        id: In(sceneIds),
        project: { id: projectId },
      },
      relations: ['uploadedBy', 'comments', 'versions'],
      order: { order: 'ASC' },
    });
  }


  private async saveVersion(scene: Scene, userId: string): Promise<void> {
    // Get current version number
    const latestVersion = await this.sceneVersionsRepository
      .createQueryBuilder('version')
      .where('version.sceneId = :sceneId', { sceneId: scene.id })
      .orderBy('version.version', 'DESC')
      .getOne();

    const versionNumber = latestVersion ? latestVersion.version + 1 : 1;

    // Create version entry
    const version = this.sceneVersionsRepository.create({
      sceneId: scene.id,
      version: versionNumber,
      fileUrl: scene.draft?.url || scene.artwork?.url,
      thumbnailUrl: scene.thumbnailUrl,
      metadata: {
        ...scene.metadata,
        width: scene.draft?.width || scene.artwork?.width,
        height: scene.draft?.height || scene.artwork?.height,
      },
      createdBy: userId,
    });

    await this.sceneVersionsRepository.save(version);
  }
}