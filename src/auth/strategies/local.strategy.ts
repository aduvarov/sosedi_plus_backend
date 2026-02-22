import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService, UserWithoutSecrets } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
	constructor(private authService: AuthService) {
		super({ usernameField: 'phone' });
	}

	async validate(phone: string, pass: string): Promise<UserWithoutSecrets> {
		const user = await this.authService.validateUser(phone, pass);
		if (!user) {
			throw new UnauthorizedException('Неверный телефон или пароль');
		}
		return user;
	}
}
