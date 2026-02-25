import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
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
		fullName?: string,
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
				fullName,
			},
		});

		// 5. Возвращаем данные без секретов
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, refreshToken, ...result } = newUser;
		return result;
	}
	// ДОБАВЛЯЕМ НОВЫЙ МЕТОД ДЛЯ СМЕНЫ ПАРОЛЯ
	async changePassword(
		userId: number,
		oldPasswordPlain: string,
		newPasswordPlain: string,
	) {
		// 1. Находим пользователя в базе
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException('Пользователь не найден');
		}

		// 2. Проверяем, совпадает ли старый пароль с хешем в базе
		const isPasswordValid = await bcrypt.compare(
			oldPasswordPlain,
			user.password,
		);
		if (!isPasswordValid) {
			throw new BadRequestException('Текущий пароль введен неверно');
		}

		// 3. Хешируем новый пароль
		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(newPasswordPlain, saltRounds);

		// 4. Обновляем пароль в базе данных
		await this.prisma.user.update({
			where: { id: userId },
			data: { password: hashedPassword },
		});

		return { message: 'Пароль успешно изменен' };
	}

	// ПОЛУЧИТЬ ВСЕХ ЖИЛЬЦОВ (с номерами их квартир)
	async findAllUsers() {
		return this.prisma.user.findMany({
			select: {
				id: true,
				phone: true,
				fullName: true,
				role: true,
				createdAt: true,
				apartmentId: true,
				apartment: {
					select: { number: true },
				},
			},
			orderBy: { apartmentId: 'asc' }, // Сортируем по номеру квартиры
		});
	}

	// УДАЛИТЬ ЖИЛЬЦА
	async deleteUser(id: number) {
		const user = await this.prisma.user.findUnique({ where: { id } });
		if (!user) {
			throw new NotFoundException('Пользователь не найден');
		}

		if (user.role === Role.ADMIN) {
			throw new BadRequestException(
				'Нельзя удалить администратора (Управдома)',
			);
		}

		return this.prisma.user.delete({
			where: { id },
		});
	}

	// ОБНОВИТЬ ДАННЫЕ ЖИЛЬЦА (Для Управдома)
	async updateUser(
		id: number,
		data: {
			phone?: string;
			fullName?: string;
			passwordPlain?: string;
			apartmentId?: number;
		},
	) {
		const user = await this.prisma.user.findUnique({ where: { id } });
		if (!user) {
			throw new NotFoundException('Пользователь не найден');
		}

		// Если меняем телефон, проверяем, не занят ли он ДРУГИМ пользователем
		if (data.phone && data.phone !== user.phone) {
			const existingPhone = await this.findByPhone(data.phone);
			if (existingPhone) {
				throw new ConflictException(
					'Этот номер телефона уже используется',
				);
			}
		}

		// Если меняем квартиру, проверяем, не занята ли она ДРУГИМ пользователем
		if (data.apartmentId && data.apartmentId !== user.apartmentId) {
			const existingAptUser = await this.prisma.user.findUnique({
				where: { apartmentId: data.apartmentId },
			});
			if (existingAptUser) {
				throw new ConflictException(
					'У этой квартиры уже есть зарегистрированный владелец',
				);
			}
		}

		// СТРОГАЯ ТИПИЗАЦИЯ ВМЕСТО any
		const updateData: {
			phone?: string;
			fullName?: string;
			apartmentId?: number;
			password?: string;
		} = {};

		if (data.phone) updateData.phone = data.phone;
		if (data.fullName !== undefined) updateData.fullName = data.fullName;
		if (data.apartmentId !== undefined)
			updateData.apartmentId = data.apartmentId;

		// Если админ ввел новый пароль, хешируем его
		if (data.passwordPlain) {
			updateData.password = await bcrypt.hash(data.passwordPlain, 10);
		}

		return this.prisma.user.update({
			where: { id },
			data: updateData,
			select: {
				id: true,
				phone: true,
				fullName: true,
				role: true,
				apartmentId: true,
			}, // Возвращаем без секретов
		});
	}
}
