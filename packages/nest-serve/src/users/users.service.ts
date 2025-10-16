import { Injectable, NotFoundException } from '@nestjs/common';
import { UserCreate } from './dto/user-create.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly users: User[] = [];

  findAll(): User[] {
    return this.users;
  }

  create(userCreate: UserCreate): User {
    const user: User = {
      id: this.users.length + 1,
      ...userCreate,
      avatarUrl: 'https://example.com/default-avatar.png',
    } as User;
    this.users.push(user);
    return user;
  }

  batchCreate(users: UserCreate[]): User[] {
    const created: User[] = users.map(u => this.create(u));
    return created;
  }

  search(q?: string, _page?: number): User[] {
    let res = this.users;
    if (q) {
      const key = q.toLowerCase();
      res = res.filter(u => (u.name && u.name.toLowerCase().includes(key)) || (u.email && u.email.toLowerCase().includes(key)));
    }
    return res;
  }

  findOne(id: number): User {
    const user = this.users.find(u => u.id === id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  update(id: number, dto: Partial<User>): User {
    const user = this.findOne(id);
    Object.assign(user, dto);
    return user;
  }

  remove(id: number): void {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) throw new NotFoundException('User not found');
    this.users.splice(idx, 1);
  }

  resetPassword(id: number, _newPassword: string): { success: boolean } {
    this.findOne(id);
    // demo: 不存储密码，仅模拟成功
    return { success: true };
  }

  uploadAvatar(id: number, file: any): { avatarUrl: string } {
    const user = this.findOne(id);
    // 在真实场景应将文件保存并返回 URL，这里模拟
    user.avatarUrl = `https://cdn.example.com/avatars/${file?.originalname || 'unknown'}`;
    return { avatarUrl: user.avatarUrl };
  }
}
