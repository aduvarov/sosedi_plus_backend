import {
	Controller,
	Post,
	UseGuards,
	Request,
	Get,
	NotFoundException,
} from '@nestjs/common';
import { AuthService, UserWithoutSecrets } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { Request as ExpressRequest } from 'express';
import { Role } from '../generated/prisma/client';
import { UsersService } from 'src/users/users.service';

// 1. Тип для логина (LocalStrategy возвращает полного юзера без секретов)
interface RequestWithUser extends ExpressRequest {
	user: UserWithoutSecrets;
}

// 2. Тип для обычных запросов (JwtStrategy возвращает id, phone, role)
interface RequestWithJwt extends ExpressRequest {
	user: {
		id: number;
		phone: string;
		role: Role;
	};
}

// 3. Тип для рефреша (JwtRefreshStrategy возвращает payload токена + сам токен)
interface RequestWithRefresh extends ExpressRequest {
	user: {
		sub: number;
		phone: string;
		role: Role;
		refreshToken: string;
	};
}

@Controller('auth')
export class AuthController {
	constructor(
		private authService: AuthService,
		private usersService: UsersService,
	) {}

	// Логин: используем RequestWithUser
	@UseGuards(AuthGuard('local'))
	@Post('login')
	async login(@Request() req: RequestWithUser) {
		return this.authService.login(req.user);
	}

	// Обновление токена: используем RequestWithRefresh
	@UseGuards(AuthGuard('jwt-refresh'))
	@Post('refresh')
	async refreshTokens(@Request() req: RequestWithRefresh) {
		const userId = req.user.sub;
		const refreshToken = req.user.refreshToken;
		return this.authService.refreshTokens(userId, refreshToken);
	}

	// Выход: используем RequestWithJwt
	@UseGuards(AuthGuard('jwt'))
	@Post('logout')
	async logout(@Request() req: RequestWithJwt) {
		await this.authService.logout(req.user.id);
		return { message: 'Успешный выход' };
	}

	// ... импорты ...
	// Убедитесь, что импортирован NotFoundException из '@nestjs/common'

	@UseGuards(AuthGuard('jwt'))
	@Get('profile')
	async getProfile(@Request() req: RequestWithJwt) {
		// Ищем пользователя в базе по ID из токена
		const user = await this.usersService.findById(req.user.id);
		if (!user) {
			throw new NotFoundException('Пользователь не найден');
		}

		// Отрезаем секретные данные перед отправкой на мобилку
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, refreshToken, ...safeUser } = user;

		return safeUser;
	}
}
