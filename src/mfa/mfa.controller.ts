import {
  Controller,
  Get,
  Post,
  Put,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { MfaService } from './mfa.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import {
  mfaSchema,
  verifyMfaForLoginSchema,
} from 'src/commons/validators/mfa.validator';
import { HTTPSTATUS } from 'src/auth/config/http.config';
import { setAuthenticaionCookies } from 'src/commons/ultils/cookie';

@Controller('mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @UseGuards(JwtAuthGuard)
  @Get('setup')
  async generateMfaSetup(@Request() req, @Response() res) {
    const userId = req.user.userId;
    const { message, qrImageUrl, secret } =
      await this.mfaService.generateMfaSetup(userId);
    return res.status(200).json({
      message,
      qrImageUrl,
      secret,
    });
  }
  @UseGuards(JwtAuthGuard)
  @Post('verify')
  async verifyMfa(@Request() req, @Response() res) {
    const { code, secretKey } = mfaSchema.parse({
      ...req.body,
    });
    const userId = req.user.userId;
    const { message, userPreferences } = await this.mfaService.verifyMFASetup(
      userId,
      code,
      secretKey,
    );

    return res.status(HTTPSTATUS.OK).json({
      message,
      userPreferences,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put('revoke')
  async revokeMfa(@Request() req, @Response() res) {
    const userId = req.user.userId;
    const { message, userPreferences } =
      await this.mfaService.revokeMFASetup(userId);

    return res.status(HTTPSTATUS.OK).json({
      message,
      userPreferences,
    });
  }

  @Post('verify-login')
  async loginWithMfa(@Request() req, @Response() res) {
    const { code, email, userAgent } = verifyMfaForLoginSchema.parse({
      ...req.body,
      userAgent: req.headers['user-agent'],
    });
    const { accessToken, refreshToken, user } =
      await this.mfaService.loginWithMFA(email, code, userAgent);

    return setAuthenticaionCookies({
      res,
      accessToken,
      refreshToken,
    })
      .status(HTTPSTATUS.OK)
      .json({
        message: 'User logged in successfully',
        user,
      });
  }
}
