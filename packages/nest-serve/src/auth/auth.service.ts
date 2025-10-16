import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthService {
  // simplest demo: hardcoded user
  login(email: string, password: string) {
    if (email === 'admin@example.com' && password === 'password') {
      return { token: 'demo-token-123' };
    }
    throw new UnauthorizedException();
  }
}
