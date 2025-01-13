import { Controller, Get, Request, Response, UseGuards } from '@nestjs/common';
import { MfaService } from './mfa.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

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
}
