import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LocalAuthGuard } from './guards/local-auth/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth/refresh-auth.guard';
import { setAuthenticaionCookies } from 'src/commons/ultils/cookie';
import { verificationEmailSchema } from 'src/commons/validators/auth.validator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  registerUser(@Body() createUser: CreateUserDto) {
    return this.authService.registerUser(createUser);
  }

  @Post('/verify-email')
  async verifyEmail(@Request() req, @Response() res) {
    const { code } = verificationEmailSchema.parse(req.body);
    const { user } = await this.authService.verifyEmail(code);
    return res.status(HttpStatus.OK).json({
      message: 'Email verified successfully',
      user,
    });
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async loginUser(@Request() req, @Response() res) {
    const userAgent = req.headers['user-agent'];
    const { accessToken, refreshToken, user, sessionId } =
      await this.authService.login(req.user.id, req.user.name, userAgent);

    if (sessionId) {
      req.session = { sessionId };
    }

    return setAuthenticaionCookies({
      res,
      accessToken,
      refreshToken,
    })
      .status(HttpStatus.OK)
      .json({
        message: 'Login successful',
        user,
        accessToken,
      });
  }

  @UseGuards(LocalAuthGuard)
  @Post('forgot-password')
  async forgotPassword(@Request() req, @Response() res) {
    const { email } = req.user;
    await this.authService.forgotPassword(email);
    return res.status(HttpStatus.OK).json({
      message: 'Password reset link sent to your email',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('protected')
  getAll(@Request() req) {
    return `Now you can access this protected API. This is your user id:  ${req.user.id}`;
  }

  @UseGuards(RefreshAuthGuard)
  @Post('refresh')
  refresh(@Request() req) {
    return this.authService.refreshToken(req.user.id, req.user.name);
  }
}
