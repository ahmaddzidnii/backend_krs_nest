import { IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Username is required.' })
  @Length(1, undefined, {
    message: 'Username must be at least 1 characters long.',
  })
  username: string;
  @IsString()
  @Length(6, 100, { message: 'Password must be at least 6 characters long.' })
  password: string;
}
