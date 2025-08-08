import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

class LoginDto {
  username!: string;
  password!: string;
}

class ChangePasswordDto {
  username!: string;
  oldPassword!: string;
  newPassword!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }
}
