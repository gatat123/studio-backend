import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');
  private connectedUsers = new Map<string, { userId: string; socketId: string }>();

  constructor(private jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Server Initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      
      if (token) {
        const payload = this.jwtService.verify(token);
        const userId = payload.sub;
        
        this.connectedUsers.set(client.id, { userId, socketId: client.id });
        
        // 사용자가 온라인 상태임을 알림
        this.server.emit('user:online', { userId });
        
        this.logger.log(`User ${userId} connected with socket ${client.id}`);
      }
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    
    if (user) {
      this.connectedUsers.delete(client.id);
      
      // 사용자가 오프라인 상태임을 알림
      this.server.emit('user:offline', { userId: user.userId });
      
      this.logger.log(`User ${user.userId} disconnected`);
    }
  }

  // 스튜디오 입장
  @SubscribeMessage('studio:join')
  handleStudioJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { studioId: string }
  ) {
    client.join(`studio:${data.studioId}`);
    this.logger.log(`Client ${client.id} joined studio ${data.studioId}`);
  }

  // 스튜디오 퇴장
  @SubscribeMessage('studio:leave')
  handleStudioLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { studioId: string }
  ) {
    client.leave(`studio:${data.studioId}`);
    this.logger.log(`Client ${client.id} left studio ${data.studioId}`);
  }

  // 프로젝트 입장
  @SubscribeMessage('project:join')
  handleProjectJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string }
  ) {
    client.join(`project:${data.projectId}`);
    this.logger.log(`Client ${client.id} joined project ${data.projectId}`);
  }

  // 프로젝트 퇴장
  @SubscribeMessage('project:leave')
  handleProjectLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string }
  ) {
    client.leave(`project:${data.projectId}`);
    this.logger.log(`Client ${client.id} left project ${data.projectId}`);
  }

  // 실시간 타이핑 알림
  @SubscribeMessage('user:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; sceneId?: string; isTyping: boolean }
  ) {
    const user = this.connectedUsers.get(client.id);
    
    if (user) {
      client.to(`project:${data.projectId}`).emit('user:typing', {
        userId: user.userId,
        sceneId: data.sceneId,
        isTyping: data.isTyping,
      });
    }
  }

  // 프로젝트 업데이트 브로드캐스트
  broadcastProjectUpdate(projectId: string, updateData: any) {
    this.server.to(`project:${projectId}`).emit('project:update', updateData);
  }

  // 씬 업데이트 브로드캐스트
  broadcastSceneUpdate(projectId: string, sceneData: any) {
    this.server.to(`project:${projectId}`).emit('scene:update', sceneData);
  }

  // 댓글 생성 브로드캐스트
  broadcastCommentCreate(projectId: string, commentData: any) {
    this.server.to(`project:${projectId}`).emit('comment:create', commentData);
  }

  // 댓글 업데이트 브로드캐스트
  broadcastCommentUpdate(projectId: string, commentData: any) {
    this.server.to(`project:${projectId}`).emit('comment:update', commentData);
  }

  // 댓글 삭제 브로드캐스트
  broadcastCommentDelete(projectId: string, commentId: string) {
    this.server.to(`project:${projectId}`).emit('comment:delete', { commentId });
  }

  // 알림 전송
  sendNotification(userId: string, notificationData: any) {
    // Find the socket ID for the user
    for (const [socketId, user] of this.connectedUsers.entries()) {
      if (user.userId === userId) {
        this.server.to(socketId).emit('notification:new', notificationData);
        this.logger.debug(`Notification sent to user ${userId}`);
        break;
      }
    }
  }

  // 다중 사용자에게 알림 전송
  sendNotificationToMultiple(userIds: string[], notificationData: any) {
    for (const userId of userIds) {
      this.sendNotification(userId, notificationData);
    }
  }
}
