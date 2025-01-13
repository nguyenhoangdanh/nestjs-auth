import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { hash } from 'argon2';
import {
  fortyFiveMinutesFromNow,
  thirtyDaysFromNow,
} from 'src/commons/ultils/date-time';
import { VerificationEnum } from 'src/commons/enums/verification.enum';
import { AppConfig } from 'src/auth/config/app.config';
import { sendEmail } from 'src/mailers/mailer';
import { verifyEmailTemplate } from 'src/mailers/template';
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { password, ...user } = createUserDto;
    const hashedPassword = await hash(password);

    const newUser = await this.prisma.user.create({
      data: {
        ...user,
        password: hashedPassword,
      },
    });

    const userId = newUser.id;

    const verificationCode = await this.prisma.verificationRequest.create({
      data: {
        userId,
        type: VerificationEnum.EMAIL_VERIFICATION,
        expires: fortyFiveMinutesFromNow(),
      },
    });

    // Send verification email link
    const verificationUrl = `${AppConfig.APP_ORIGIN}/confirm-account?code=${verificationCode.code}&verification`;

    await sendEmail({
      to: newUser.email,
      ...verifyEmailTemplate(verificationUrl),
    });

    const newUserPreferences = await this.prisma.userPreferences.create({
      data: {
        userId,
        enable2FA: false,
        twoFactorSecret: '',
        emailNotification: true,
      },
    });

    return {
      user: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isEmailVerified: newUser.isEmailVerified,
        userPreferences: newUserPreferences,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      },
    };

    // return await this.prisma.user.create({
    //   data: {
    //     ...user,
    //     password: hashedPassword,
    //   },
    // });
  }

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async createSessionAfterLogin(
    userId: string,
    userAgent: string,
  ): Promise<{ sessionId: string }> {
    const session = await this.prisma.session.create({
      data: {
        userId,
        userAgent,
        createdAt: new Date(),
        expiresAt: thirtyDaysFromNow(),
      },
    });

    return {
      sessionId: session.id,
    };
  }

  async findOne(userId: string) {
    return await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  }
}
