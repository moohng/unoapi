import { ApiPropertyOptional } from '@nestjs/swagger';

export class UserUpdate {
  @ApiPropertyOptional({ description: '用户名' })
  name?: string;

  @ApiPropertyOptional({ description: '邮箱' })
  email?: string;
}
