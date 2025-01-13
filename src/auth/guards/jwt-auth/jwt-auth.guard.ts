import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { AppConfig } from 'src/auth/config/app.config';
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly jwtService: JwtService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException({ message: 'Unauthorized access token' });
    }
    try {
      const payload = this.jwtService.verify(token, {
        secret: AppConfig.JWT.SECRET,
      });
      request['user'] = payload;
      request['userId'] = payload.userId;
      request['sessionId'] = payload.sessionId;
    } catch (error) {
      console.log('error', error);
      throw new UnauthorizedException({ message: 'Unauthorized access token' });
    }
    return true;
  }

  private extractTokenFromHeader(request): string | undefined {
    // const [type, token] = request.headers.authorization?.split(' ') ?? [];
    // return type === 'Bearer' ? token : undefined;

    // const accessToken = request.headers?.cookie?.split('=')[1];
    const accessToken = request.headers?.cookie
      ? request.headers.cookie.split('=')[1]
      : null;
    return accessToken;
  }
}
