import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SceneVersion } from '../entities/scene-version.entity';
import { Scene } from '../entities/scene.entity';
import { CreateSceneVersionDto } from '../dto/create-scene-version.dto';

@Injectable()
export class SceneVersionService {
  constructor(
    @InjectRepository(SceneVersion)
    private readonly sceneVersionRepository: Repository<SceneVersion>,
    @InjectRepository(Scene)
    private readonly sceneRepository: Repository<Scene>,
  ) {}

  async createVersion(
    sceneId: string,
    createDto: CreateSceneVersionDto,
    userId: string,
  ): Promise<SceneVersion> {
    const scene = await this.sceneRepository.findOne({
      where: { id: sceneId },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found');
    }

    // 현재 최신 버전 번호 가져오기
    const latestVersion = await this.sceneVersionRepository
      .createQueryBuilder('version')
      .where('version.sceneId = :sceneId', { sceneId })
      .orderBy('version.version', 'DESC')
      .getOne();
    const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

    // 새 버전 생성
    const version = this.sceneVersionRepository.create({
      sceneId,
      version: newVersionNumber,
      fileUrl: createDto.fileUrl,
      thumbnailUrl: createDto.thumbnailUrl,
      metadata: {
        ...createDto.metadata,
        changeDescription: createDto.changeDescription,
      },
      createdBy: userId,
    });

    return this.sceneVersionRepository.save(version);
  }

  async findAllVersions(sceneId: string): Promise<SceneVersion[]> {
    return this.sceneVersionRepository.find({
      where: { sceneId },
      order: { version: 'DESC' },
      relations: ['creator'],
    });
  }

  async findVersion(sceneId: string, versionId: string): Promise<SceneVersion> {
    const version = await this.sceneVersionRepository.findOne({
      where: { id: versionId, sceneId },
      relations: ['creator'],
    });
    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return version;
  }

  async compareVersions(
    sceneId: string,
    versionId1: string,
    versionId2: string,
  ): Promise<{ version1: SceneVersion; version2: SceneVersion }> {
    const [version1, version2] = await Promise.all([
      this.findVersion(sceneId, versionId1),
      this.findVersion(sceneId, versionId2),
    ]);

    return { version1, version2 };
  }

  async restoreVersion(
    sceneId: string,
    versionId: string,
    userId: string,
  ): Promise<Scene> {
    const version = await this.findVersion(sceneId, versionId);
    const scene = await this.sceneRepository.findOne({
      where: { id: sceneId },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found');
    }
    // 현재 상태를 새 버전으로 저장
    await this.createVersion(
      sceneId,
      {
        fileUrl: scene.draft?.url || scene.artwork?.url,
        thumbnailUrl: scene.thumbnailUrl,
        metadata: scene.metadata,
        changeDescription: `Restored from version ${version.version}`,
      },
      userId,
    );

    // Scene를 선택된 버전으로 복원
    if (version.fileUrl) {
      if (scene.draft) {
        scene.draft.url = version.fileUrl;
      } else if (scene.artwork) {
        scene.artwork.url = version.fileUrl;
      }
    }

    scene.thumbnailUrl = version.thumbnailUrl;
    scene.metadata = version.metadata;

    return this.sceneRepository.save(scene);
  }

  async archiveOldVersions(sceneId: string, keepCount: number = 10): Promise<void> {
    const versions = await this.sceneVersionRepository.find({
      where: { sceneId, isArchived: false },
      order: { version: 'DESC' },
    });
    if (versions.length > keepCount) {
      const versionsToArchive = versions.slice(keepCount);
      const archiveDate = new Date();

      await Promise.all(
        versionsToArchive.map((version) =>
          this.sceneVersionRepository.update(version.id, {
            isArchived: true,
            archivedAt: archiveDate,
          }),
        ),
      );
    }
  }
}