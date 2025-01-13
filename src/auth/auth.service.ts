import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { UserService } from '../user/user.service';
import { verify } from 'argon2';
import { AuthJwtPayload } from './types/auth-jwtPayload';
import { JwtService } from '@nestjs/jwt';
// import { PrismaService } from 'src/prisma/prisma.service';
// import { thirtyDaysFromNow } from 'src/commons/ultils/date-time';
import refreshConfig from './config/refresh-jwt.config';
import { ConfigType } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { VerificationEnum } from 'src/commons/enums/verification.enum';
import { anHourFromNow, threeMinutesAgo } from 'src/commons/ultils/date-time';
import { AppConfig } from './config/app.config';
import { sendEmail } from 'src/mailers/mailer';
import { passwordResetTemplate } from 'src/mailers/template';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject(refreshConfig.KEY)
    private readonly refreshTokenConfig: ConfigType<typeof refreshConfig>,
  ) {}

  async registerUser(createUserDto: CreateUserDto) {
    const user = await this.userService.findByEmail(createUserDto.email);

    if (user) {
      throw new ConflictException('User already exists');
    }

    return await this.userService.create(createUserDto);
  }

  async verifyEmail(code: string) {
    const validCode = await this.prisma.verificationRequest.findFirst({
      where: {
        code,
        type: VerificationEnum.EMAIL_VERIFICATION,
        expires: {
          gte: new Date(),
        },
      },
    });

    if (!validCode) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id: validCode.userId,
      },
      data: {
        isEmailVerified: true,
      },
    });

    if (!updatedUser) {
      throw new UnauthorizedException('Unable to verify email');
    }

    await this.prisma.verificationRequest.delete({
      where: {
        id: validCode.id,
      },
    });

    return {
      user: updatedUser,
    };
  }

  async validateLocalUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('User not found!');
    }

    const isPasswordMatched = await verify(user.password, password);

    if (!isPasswordMatched) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      id: user.id,
      name: user.name,
    };
  }

  async login(userId: string, name?: string, userAgent?: string) {
    // const session = await this.prisma.session.create({
    //   data: {
    //     userId,
    //     userAgent,
    //     createdAt: new Date(),
    //     expiresAt: thirtyDaysFromNow(),
    //   },
    // });

    const { sessionId } = await this.userService.createSessionAfterLogin(
      userId,
      userAgent,
    );

    const { accessToken, refreshToken } = await this.generateTokens(
      userId,
      sessionId,
    );

    return {
      accessToken,
      refreshToken,
      sessionId,
      user: {
        id: userId,
        name,
        userAgent,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    //check mail rate limit is 2 emails per 3 or 10 minutes
    const timeAgo = threeMinutesAgo();
    const maxAttempts = 2;

    const count = await this.prisma.verificationRequest.count({
      where: {
        userId: user.id,
        type: VerificationEnum.PASSWORD_RESET,
        createdAt: {
          gte: timeAgo,
        },
      },
    });

    if (count >= maxAttempts) {
      throw new UnauthorizedException('Too many requests, try again later');
    }

    const expriesAt = anHourFromNow();

    const validCode = await this.prisma.verificationRequest.create({
      data: {
        userId: user.id,
        type: VerificationEnum.PASSWORD_RESET,
        expires: expriesAt,
      },
    });

    const resetLink = `${AppConfig.APP_ORIGIN}/reset-password?code=${validCode.code}&exp=${expriesAt.getTime()}`;

    const { data, error } = await sendEmail({
      to: user.email,
      ...passwordResetTemplate(resetLink),
    });

    if (!data) {
      throw new InternalServerErrorException(
        `${error?.name} - ${error?.message}`,
      );
    }

    return {
      message: 'Password reset link sent successfully, please check your email',
      url: resetLink,
      emailId: data.id,
    };
  }

  async generateTokens(userId: string, sessionId?: string) {
    const payload: AuthJwtPayload = { sub: userId, sessionId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({
        userId: payload.sub,
        sessionId: payload.sessionId,
      }),
      this.jwtService.signAsync(payload, this.refreshTokenConfig),
    ]);

    // const refreshToken = this.jwtService.sign(
    //   {
    //     sessionId: payload.sessionId,
    //   },
    //   {
    //     expiresIn: AppConfig.JWT.REFRESH_EXPIRES_IN,
    //     secret: AppConfig.JWT.REFRESH_SECRET,
    //   },
    // );

    return {
      accessToken,
      refreshToken,
    };
  }

  async validateJwtUser(userId: string, sessionId: string) {
    const user = await this.userService.findOne(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const currentUser = { id: user.id, sessionId };

    console.log('currentUser', currentUser);

    return currentUser;
  }

  async validateRefreshToken(userId: string) {
    const user = await this.userService.findOne(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const currentUser = { id: user.id };

    return currentUser;
  }

  async refreshToken(userId: string, name: string) {
    const { accessToken, refreshToken } = await this.generateTokens(
      userId,
      // session.id,
    );

    return {
      id: userId,
      name,
      accessToken,
      refreshToken,
    };
  }
}
