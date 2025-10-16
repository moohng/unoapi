import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginRequest } from './dto/login-request.dto';

@Controller('auth')
@ApiTags('认证')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  @ApiOkResponse({ description: '登录成功，返回 Token' })
  login(@Body() body: LoginRequest) {
    return this.authService.login(body.email, body.password);
  }
}
