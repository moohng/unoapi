import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CatsService } from './cats.service';
import { CreateCatDto } from './dto/create-cat.dto';
import { Cat } from './entities/cat.entity';
import { Res } from './entities/res.entity';

@ApiTags('cats')
@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  @ApiOperation({ summary: '创建一个 Cat', description: '创建一个新的 Cat 实体并返回它' })
  @ApiResponse({ status: 201, description: 'The cat has been successfully created.', type: Cat })
  async create(@Body() createCatDto: CreateCatDto): Promise<Cat> {
    return this.catsService.create(createCatDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定 ID 的 Cat', description: '根据提供的 ID 获取对应的 Cat 实体' })
  @ApiResponse({ status: 200, description: '成功获取 Cat 实体', type: Res<Cat> })
  findOne(@Param('id') id: string): Res<Cat> {
    return {
      code: 200,
      message: 'Success',
      data: this.catsService.findOne(+id),
    };
  }
}
