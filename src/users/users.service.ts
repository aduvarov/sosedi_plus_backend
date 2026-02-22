import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../generated/prisma/client';
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
}
