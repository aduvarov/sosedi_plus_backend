import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
	Strategy,
	'jwt-refresh',
) {
	constructor() {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			// Добавляем фолбэк
			secretOrKey:
				process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
			passReqToCallback: true,
		});
	}

	validate(req: Request, payload: JwtPayload) {
		const refreshToken = req
			.get('Authorization')
			?.replace('Bearer', '')
			.trim();
		return { ...payload, refreshToken };
	}
}
