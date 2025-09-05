import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain at least 1 uppercase, 1 lowercase, and 1 number or special character',
  })
  password: string;

  @IsString()
  @IsOptional()
  nickname?: string;
}
