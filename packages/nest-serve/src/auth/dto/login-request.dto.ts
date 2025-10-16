import { ApiProperty } from '@nestjs/swagger';

export class LoginRequest {
  @ApiProperty({ description: '邮箱' })
  email: string;

  @ApiProperty({ description: '密码' })
  password: string;
}
