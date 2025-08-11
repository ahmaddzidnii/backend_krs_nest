import { IsArray } from 'class-validator';

export class ClassStatusDto {
  @IsArray()
  classIds: string[];
}
