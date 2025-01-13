import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

@Injectable()
export class MfaService {
  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
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
}
