import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  async register(@Body() authDto: AuthDto) {
    return this.authService.register(authDto);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() authDto: AuthDto) {
    try {
      return await this.authService.verifyOtp(authDto);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('login')
  async login(@Body() authDto: AuthDto) {
    try {
      // Validate the input and call the login method from authService
      const result = await this.authService.login(authDto);
      return result;
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}