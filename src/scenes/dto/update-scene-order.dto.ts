import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSceneOrderDto {
  @ApiProperty({ type: () => [SceneOrderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SceneOrderDto)
  scenes: SceneOrderDto[];
}

class SceneOrderDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsNumber()
  order: number;
}
