import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class MfaService {
  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}
  async generateMfaSetup(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        userPreferences: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.userPreferences.enable2FA) {
      throw new NotFoundException('Mfa already enabled');
    }

    let secretKey = user.userPreferences.twoFactorSecret;

    if (!secretKey) {
      const secret = speakeasy.generateSecret({ name: 'Hoang Danh Nguyen' });
      secretKey = secret.base32;
      user.userPreferences.twoFactorSecret = secretKey;
      await this.prisma.userPreferences.update({
        where: {
          userId: userId,
        },
        data: {
          twoFactorSecret: secretKey,
        },
      });
    }

    const url = speakeasy.otpauthURL({
      secret: secretKey,
      label: `${user.name}`,
      issuer: 'hoangdanhnguyen.com',
      encoding: 'base32',
    });

    const qrImageUrl = await qrcode.toDataURL(url);

    return {
      message: 'Scan the QR code or use the setup key.',
      secret: secretKey,
      qrImageUrl,
    };
  }

  async verifyMFASetup(userId: string, code: string, secretKey: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        userPreferences: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.userPreferences.enable2FA) {
      return {
        message: 'MFA already enabled',
        userPreferences: {
          enable2FA: user.userPreferences.enable2FA,
        },
      };
    }

    // // Generate a TOTP code
    const tokenCode = speakeasy.totp({
      secret: secretKey,
      encoding: 'base32',
    });
    console.log('tokenCode', tokenCode);

    // const OTPCode = `${config.APP_ORIGIN}/mfa/verify`;

    // await sendEmail({
    //     to: user.email,
    //     ...mfaSetupTemplate(tokenCode),
    // })

    const isValid = speakeasy.totp.verify({
      secret: secretKey,
      encoding: 'base32',
      token: tokenCode,
    });

    if (!isValid) {
      throw new NotFoundException('Invalid code, please try again');
    }

    await this.prisma.userPreferences.update({
      where: {
        userId: userId,
      },
      data: {
        enable2FA: true,
      },
    });

    const userPreferences = await this.prisma.userPreferences.findUnique({
      where: {
        userId: userId,
      },
    });

    return {
      message: 'MFA enabled successfully',
      userPreferences,
    };
  }

  public async revokeMFASetup(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        userPreferences: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not unauthorized');
    }

    if (!user.userPreferences.enable2FA) {
      return {
        message: 'MFA already disabled',
        userPreferences: {
          enable2FA: user.userPreferences.enable2FA,
        },
      };
    }

    user.userPreferences.enable2FA = false;
    user.userPreferences.twoFactorSecret = '';
    await this.prisma.userPreferences.update({
      where: {
        userId: userId,
      },
      data: {
        enable2FA: false,
        twoFactorSecret: '',
      },
    });

    return {
      message: 'MFA revoke successfully',
      userPreferences: {
        enable2FA: user.userPreferences.enable2FA,
      },
    };
  }

  public async loginWithMFA(email: string, code: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        userPreferences: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      !user.userPreferences.enable2FA &&
      !user.userPreferences.twoFactorSecret
    ) {
      throw new NotFoundException('MFA not enabled');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.userPreferences.twoFactorSecret,
      encoding: 'base32',
      token: code,
    });

    if (!isValid) {
      throw new NotFoundException('Invalid code, please try again');
    }

    const { sessionId } = await this.userService.createSessionAfterLogin(
      user.id,
      userAgent,
    );

    const { accessToken, refreshToken } = await this.authService.generateTokens(
      user.id,
      sessionId,
    );

    return {
      accessToken,
      refreshToken,
      sessionId,
      user: {
        id: user.id,
        name: user.name,
        userAgent,
      },
    };
  }
}
