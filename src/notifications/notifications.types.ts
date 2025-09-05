export enum NotificationType {
  COMMENT = 'comment',
  MENTION = 'mention',
  INVITE = 'invite',
  PROJECT_UPDATE = 'project_update',
  SCENE_UPDATE = 'scene_update',
  PROJECT_COMPLETED = 'project_completed',
  MEMBER_JOINED = 'member_joined',
  MEMBER_LEFT = 'member_left',
  TASK_ASSIGNED = 'task_assigned',
  DEADLINE_REMINDER = 'deadline_reminder',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface NotificationMetadata {
  projectId?: string;
  studioId?: string;
  sceneId?: string;
  commentId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  [key: string]: any;
}
