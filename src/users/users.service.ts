import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
	constructor(private prisma: PrismaService) {}

	async findByPhone(phone: string): Promise<User | null> {
		return this.prisma.user.findUnique({ where: { phone } });
	}

	async findById(id: number): Promise<User | null> {
		return this.prisma.user.findUnique({ where: { id } });
	}

	// Сохраняем хэш Refresh-токена при логине
	async updateRefreshToken(
		userId: number,
		refreshToken: string,
	): Promise<void> {
		const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
		await this.prisma.user.update({
			where: { id: userId },
			data: { refreshToken: hashedRefreshToken },
		});
	}

	// Удаляем токен при выходе (Logout)
	async removeRefreshToken(userId: number): Promise<void> {
		await this.prisma.user.update({
			where: { id: userId },
			data: { refreshToken: null },
		});
	}

	async createUser(
		phone: string,
		passwordPlain: string,
		apartmentId: number,
	) {
		// 1. Проверяем, не занят ли телефон
		const existingUser = await this.findByPhone(phone);
		if (existingUser) {
			throw new ConflictException(
				'Пользователь с таким телефоном уже существует',
			);
		}

		// 2. Проверяем, не привязан ли уже кто-то к этой квартире
		const apartmentOwner = await this.prisma.user.findUnique({
			where: { apartmentId },
		});
		if (apartmentOwner) {
			throw new ConflictException(
				'У этой квартиры уже есть зарегистрированный владелец',
			);
		}

		// 3. Хешируем пароль
		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(passwordPlain, saltRounds);

		// 4. Создаем пользователя (по умолчанию с ролью USER)
		const newUser = await this.prisma.user.create({
			data: {
				phone,
				password: hashedPassword,
				role: Role.USER,
				apartmentId,
			},
		});

		// 5. Возвращаем данные без секретов
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, refreshToken, ...result } = newUser;
		return result;
	}
}
