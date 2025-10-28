import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UserCreate } from './dto/user-create.dto';
import { UserUpdate } from './dto/user-update.dto';
import { ResetPasswordRequest } from './dto/reset-password.dto';
import { User } from './entities/user.entity';
import { ApiOkResponse, ApiOperation, ApiTags, ApiConsumes, ApiQuery, ApiParam } from '@nestjs/swagger';

@Controller('users')
@ApiTags('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: '获取用户列表' })
  @ApiOkResponse({ description: '用户数组', type: [User] })
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @ApiOperation({ summary: '创建用户' })
  @ApiOkResponse({ description: '用户创建成功', type: User })
  create(@Body() createUserDto: UserCreate): User {
    return this.usersService.create(createUserDto);
  }

  @Post('batch')
  @ApiOperation({ summary: '批量创建用户' })
  @ApiOkResponse({ description: '批量创建成功', type: [User] })
  batchCreate(@Body() users: UserCreate[]) {
    return this.usersService.batchCreate(users);
  }

  @Get('search')
  @ApiOperation({ summary: '搜索用户' })
  @ApiQuery({ name: 'q', required: false, description: '搜索关键词（姓名或邮箱）' })
  @ApiOkResponse({ description: '搜索结果', type: [User] })
  search(@Query('q') q?: string, @Query('page') page?: number) {
    return this.usersService.search(q, page);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定用户信息' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiOkResponse({ description: '用户信息', type: User })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新用户信息' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UserUpdate) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: '重置用户密码' })
  resetPassword(@Param('id', ParseIntPipe) id: number, @Body() body: ResetPasswordRequest) {
    return this.usersService.resetPassword(id, body.newPassword);
  }

  @Put(':id/avatar')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: '上传/更新用户头像' })
  uploadAvatar(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: any) {
    return this.usersService.uploadAvatar(id, file);
  }
}
