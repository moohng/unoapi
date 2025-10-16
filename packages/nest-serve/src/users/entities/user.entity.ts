import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class User {
  @ApiProperty({ description: '用户ID' })
  id: number;

  @ApiProperty({ description: '用户名' })
  name: string;

  @ApiPropertyOptional({ description: '邮箱' })
  email?: string;

  @ApiPropertyOptional({ description: '头像地址' })
  avatarUrl?: string;
}
