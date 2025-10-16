import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserCreate {
  @ApiProperty({ description: '用户名' })
  name: string;

  @ApiProperty({ description: '密码' })
  password: string;

  @ApiPropertyOptional({ description: '邮箱' })
  email?: string;
}
