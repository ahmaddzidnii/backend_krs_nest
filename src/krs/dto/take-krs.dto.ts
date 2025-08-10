import { IsNotEmpty, IsString, Length } from 'class-validator';

export class TakeKRSDto {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  id_kelas: string;
}
