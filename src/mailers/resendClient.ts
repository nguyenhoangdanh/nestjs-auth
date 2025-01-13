import { Resend } from 'resend';
import { AppConfig } from 'src/auth/config/app.config';

export const resend = new Resend(AppConfig.RESEND_API_KEY);
