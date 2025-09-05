// Common response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

// Pagination interfaces
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// User context interface
export interface UserContext {
  userId: string;
  email: string;
  role: string;
}

// File upload interfaces
export interface FileUploadResult {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  metadata?: Record<string, any>;
}

export interface BulkUploadOptions {
  projectId: string;
  uploadType: 'draft' | 'artwork' | 'both';
  matchingStrategy: 'byName' | 'byOrder' | 'manual';
  overwrite?: boolean;
}

// WebSocket event interfaces
export interface SocketEvent {
  event: string;
  data: any;
  userId?: string;
  room?: string;
  timestamp: Date;
}

// Activity log interface
export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  target: string;
  targetId: string;
  details?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}
