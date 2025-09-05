import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일은 필수 입력 항목입니다.' })
  @MaxLength(100, { message: '이메일은 100자를 초과할 수 없습니다.' })
  email: string;

  @IsString({ message: '패스워드는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '패스워드는 필수 입력 항목입니다.' })
  @MinLength(8, { message: '패스워드는 최소 8자 이상이어야 합니다.' })
  @MaxLength(50, { message: '패스워드는 50자를 초과할 수 없습니다.' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: '패스워드는 대소문자, 숫자, 특수문자를 포함해야 합니다.' },
  )
  password: string;

  @IsString({ message: '닉네임은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '닉네임은 필수 입력 항목입니다.' })
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
  @MaxLength(20, { message: '닉네임은 20자를 초과할 수 없습니다.' })
  @Matches(/^[가-힣a-zA-Z0-9_]+$/, {
    message: '닉네임은 한글, 영문, 숫자, 언더스코어만 사용 가능합니다.',
  })
  nickname: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: '자기소개는 500자를 초과할 수 없습니다.' })
  bio?: string;
}
