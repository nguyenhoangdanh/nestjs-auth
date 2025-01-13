import { registerAs } from '@nestjs/config';
import { JwtSignOptions } from '@nestjs/jwt';
import { AppConfig } from './app.config';

export default registerAs(
  'refresh-jwt',
  (): JwtSignOptions => ({
    secret: AppConfig.JWT.REFRESH_SECRET,
    expiresIn: AppConfig.JWT.REFRESH_EXPIRES_IN,
  }),
);
