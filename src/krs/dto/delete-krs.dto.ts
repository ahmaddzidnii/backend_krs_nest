import { IsNotEmpty, IsString, Length } from 'class-validator';

export class DeleteKrsDto {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  classId: string;
}
