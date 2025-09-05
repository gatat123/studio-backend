import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  // 캐시 키 생성
  private generateKey(prefix: string, ...parts: any[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  // 캐시 가져오기 또는 설정
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl = 300 // 5분 기본값
  ): Promise<T> {
    const cached = await this.cacheManager.get<T>(key);
    
    if (cached !== undefined && cached !== null) {
      return cached;
    }
    
    const value = await factory();
    await this.cacheManager.set(key, value, ttl * 1000);
    return value;
  }

  // 프로젝트 캐시
  async cacheProject(projectId: string, data: any, ttl = 600) {
    const key = this.generateKey('project', projectId);
    await this.cacheManager.set(key, data, ttl * 1000);
  }

  async getProject(projectId: string) {
    const key = this.generateKey('project', projectId);
    return this.cacheManager.get(key);
  }

  async invalidateProject(projectId: string) {
    const key = this.generateKey('project', projectId);
    await this.cacheManager.del(key);
  }

  // Scene 캐시
  async cacheScenes(projectId: string, scenes: any[], ttl = 300) {
    const key = this.generateKey('scenes', projectId);
    await this.cacheManager.set(key, scenes, ttl * 1000);
  }

  async getScenes(projectId: string) {
    const key = this.generateKey('scenes', projectId);
    return this.cacheManager.get(key);
  }

  async invalidateScenes(projectId: string) {
    const key = this.generateKey('scenes', projectId);
    await this.cacheManager.del(key);
  }

  // 패턴 기반 캐시 삭제
  async invalidatePattern(pattern: string) {
    const keys = await this.cacheManager.store.keys();
    const keysToDelete = keys.filter(key => key.includes(pattern));
    
    await Promise.all(
      keysToDelete.map(key => this.cacheManager.del(key))
    );
  }

  // 사용자별 캐시
  async cacheUserData(userId: string, data: any, ttl = 1800) {
    const key = this.generateKey('user', userId);
    await this.cacheManager.set(key, data, ttl * 1000);
  }

  async getUserData(userId: string) {
    const key = this.generateKey('user', userId);
    return this.cacheManager.get(key);
  }

  // 전체 캐시 클리어
  async clearAll() {
    await this.cacheManager.reset();
  }
}