import { Inject, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigType } from "@nestjs/config";
import { AuthJwtPayload } from "../types/auth-jwtPayload";
import { AuthService } from "../auth.service";
import refreshJwtConfig from "../config/refresh-jwt.config";

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(Strategy,"refresh-jwt") {
    constructor(
        @Inject(refreshJwtConfig.KEY)
        private refreshTokenConfig: ConfigType<typeof refreshJwtConfig>,
        private readonly authService: AuthService,
        ) {
        super({
            jwtFromRequest: ExtractJwt.fromBodyField("refresh"),
            secretOrKey: refreshTokenConfig.secret,
            ignoreExpiration: false,
        });
    }

    // request.user

    validate(payload: AuthJwtPayload) {
        const userId = payload.sub;
        return this.authService.validateRefreshToken(userId);
    }
 }