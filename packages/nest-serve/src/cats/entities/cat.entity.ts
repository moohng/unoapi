import { ApiProperty } from '@nestjs/swagger';

export class Cat {
  /**
   * The name of the cat
   * @example "Whiskers"
   */
  @ApiProperty({ example: 'Whiskers', description: 'The name of the cat' })
  name: string;

  @ApiProperty({ example: 3, description: 'The age of the cat in years' })
  age: number;

  @ApiProperty({ example: 'Tabby', description: 'The breed of the cat' })
  breed: string;
}
