import { Response, CookieOptions } from 'express';
import { calculateExpirationDate } from './date-time';
import { AppConfig } from 'src/auth/config/app.config';

type CookiePayloadType = {
    res: Response;
    accessToken: string;
    refreshToken: string;
}

const defaults: CookieOptions = {
    httpOnly: true,
    // secure: config.NODE_ENV === 'production' ? true : false,
    // sameSite: config.NODE_ENV === 'production' ? 'strict' : 'lax',
}


export const REFRESH_PATH = `${AppConfig.BASE_PATH}/auth/refresh-token`;

export const getRefreshTokenCookieOptions = (): CookieOptions => {
    const expiresIn = AppConfig.JWT.REFRESH_EXPIRES_IN;
    const expires = calculateExpirationDate(expiresIn);
    return {
        ...defaults,
        expires,
        path: REFRESH_PATH,
    }
}

export const getAccessTokenCookieOptions = (): CookieOptions => {
    const expiresIn = AppConfig.JWT.EXPIRES_IN;
    const expires = calculateExpirationDate(expiresIn);
    return {
        ...defaults,
        expires,
        path: "/",
    }
}

export const setAuthenticaionCookies = ({ res, accessToken, refreshToken }: CookiePayloadType): Response => {
    res.cookie('accessToken', accessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());
    return res;
};
export const clearAuthenticaionCookies = (res: Response): Response =>
    res.clearCookie('accessToken').clearCookie('refreshToken',{
        path: REFRESH_PATH,
    });