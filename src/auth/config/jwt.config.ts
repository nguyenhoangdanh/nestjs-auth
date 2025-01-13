import { registerAs } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
import { AppConfig } from './app.config';

export default registerAs(
  'jwt',
  (): JwtModuleOptions => ({
    global: true,
    secret: AppConfig.JWT.SECRET,
    signOptions: {
      expiresIn: AppConfig.JWT.EXPIRES_IN,
    },
  }),
);
