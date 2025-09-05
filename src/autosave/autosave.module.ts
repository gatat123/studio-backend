import { Module } from '@nestjs/common';
import { AutoSaveService } from './autosave.service';
import { AutoSaveController } from './autosave.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AutoSaveController],
  providers: [AutoSaveService],
  exports: [AutoSaveService],
})
export class AutoSaveModule {}
