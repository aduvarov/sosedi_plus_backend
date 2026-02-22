import { Injectable, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, Role } from '../generated/prisma/client'; // Добавили импорт Role

export type UserWithoutSecrets = Omit<User, 'password' | 'refreshToken'>;

export interface Tokens {
	accessToken: string;
	refreshToken: string;
}

@Injectable()
export class AuthService {
	constructor(
		private usersService: UsersService,
		private jwtService: JwtService,
	) {}

	async validateUser(
		phone: string,
		pass: string,
	): Promise<UserWithoutSecrets | null> {
		const user = await this.usersService.findByPhone(phone);
		if (user && (await bcrypt.compare(pass, user.password))) {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { password, refreshToken, ...result } = user;
			return result;
		}
		return null;
	}

	// Заменили тип role со string на Role
	async getTokens(
		userId: number,
		phone: string,
		role: Role,
	): Promise<Tokens> {
		// Явно гарантируем TypeScript, что это всегда будет строка
		const accessSecret =
			process.env.JWT_ACCESS_SECRET || 'default_access_secret';
		const refreshSecret =
			process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';

		const [accessToken, refreshToken] = await Promise.all([
			this.jwtService.signAsync(
				{ sub: userId, phone, role },
				{ secret: accessSecret, expiresIn: '15m' },
			),
			this.jwtService.signAsync(
				{ sub: userId, phone, role },
				{ secret: refreshSecret, expiresIn: '30d' },
			),
		]);

		return { accessToken, refreshToken };
	}

	async login(user: UserWithoutSecrets): Promise<Tokens> {
		const tokens = await this.getTokens(user.id, user.phone, user.role);
		await this.usersService.updateRefreshToken(
			user.id,
			tokens.refreshToken,
		);
		return tokens;
	}

	async logout(userId: number): Promise<void> {
		await this.usersService.removeRefreshToken(userId);
	}

	async refreshTokens(userId: number, refreshToken: string): Promise<Tokens> {
		const user = await this.usersService.findById(userId);

		// Строгая проверка: убеждаемся, что токен существует и это точно строка
		if (!user || typeof user.refreshToken !== 'string') {
			throw new ForbiddenException('Доступ запрещен');
		}

		const refreshTokenMatches = await bcrypt.compare(
			refreshToken,
			user.refreshToken,
		);
		if (!refreshTokenMatches) {
			throw new ForbiddenException('Доступ запрещен');
		}

		const tokens = await this.getTokens(user.id, user.phone, user.role);
		await this.usersService.updateRefreshToken(
			user.id,
			tokens.refreshToken,
		);
		return tokens;
	}
}
