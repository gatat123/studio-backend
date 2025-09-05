import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { Comment } from '../entities/comment.entity';
import { Scene } from '../entities/scene.entity';
import { Project } from '../entities/project.entity';
import { WebsocketModule } from '../websocket/websocket.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, Scene, Project]),
    forwardRef(() => WebsocketModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}