import { ApiProperty } from '@nestjs/swagger';

export class Res<T> {
  @ApiProperty({ description: '响应状态码' })
  code: number;
  @ApiProperty({ description: '响应消息' })
  message: string;
  @ApiProperty({ description: '响应数据' })
  data: T;
}
