export interface IUserPreferences {
  enable2FA: boolean;
  emailNotifications: boolean;
  twoFactorSecret: string;
}

export interface IRegisterDto {
  username: string;
  password: string;
  email: string;
  confirmPassword: string;
  userAgent?: string;
}

export interface ILoginDto {
  email?: string;
  password?: string;
  userAgent?: string;
}

export interface IResetPasswordDto {
  password: string;
  verificationCode: string;
}
