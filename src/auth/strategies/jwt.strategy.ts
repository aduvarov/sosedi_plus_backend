import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Role } from '../../generated/prisma/client'; // Импортируем Role из сгенерированного клиента

export interface JwtPayload {
	sub: number;
	phone: string;
	role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
	constructor() {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			// Добавляем фолбэк, чтобы TypeScript был уверен, что это строка
			secretOrKey:
				process.env.JWT_ACCESS_SECRET || 'default_access_secret',
		});
	}

	validate(payload: JwtPayload) {
		return { id: payload.sub, phone: payload.phone, role: payload.role };
	}
}
