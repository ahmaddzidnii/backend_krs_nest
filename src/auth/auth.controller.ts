import { Response } from 'express';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  ValidationPipe,
} from '@nestjs/common';

import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { LoginResponse } from './auth.response';
import { WebResponse } from '../model/web.model';
import { Auth, SessionObject } from './auth.decorator';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('/login')
  @HttpCode(200)
  async login(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    request: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WebResponse<LoginResponse>> {
    const response = await this.authService.login(request);
    const sessionExpInMiutes = this.configService.get(
      'SESSION_EXP_IN_MINUTES',
      60,
    );
    res.cookie('session_id', response.session_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: sessionExpInMiutes * 60 * 1000,
    });
    return {
      data: response,
    };
  }

  @Post('/logout')
  @HttpCode(200)
  async logout(
    @Auth() { session }: SessionObject,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(session.session_id);
    res.clearCookie('session_id');
    return {
      message: 'Logout successful',
    };
  }

  @Get('/session')
  async getSession(
    @Auth() session: SessionObject,
  ): Promise<WebResponse<SessionObject>> {
    const sessionData = await this.authService.getMe(session);
    return {
      data: sessionData,
    };
  }
}
