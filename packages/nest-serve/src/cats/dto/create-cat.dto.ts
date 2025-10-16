import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class CreateCatDto {
  @ApiProperty({ description: 'The name of the cat', required: true })
  @IsString()
  readonly name: string;

  @IsInt()
  @ApiProperty({ description: 'The age of the cat in years', minimum: 3 })
  readonly age: number;

  @IsString()
  @ApiProperty({ description: 'The breed of the cat', maxLength: 50 })
  readonly breed: string;
}
