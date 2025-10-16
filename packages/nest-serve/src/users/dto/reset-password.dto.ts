import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordRequest {
  @ApiProperty({ description: '新密码' })
  newPassword: string;
}
