import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard) // Защищаем контроллер
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	// Эндпоинт для регистрации нового соседа (только для Админа)
	@Post('register-neighbor')
	@Roles(Role.ADMIN)
	async registerNeighbor(
		@Body()
		body: {
			phone: string;
			passwordPlain: string;
			apartmentId: number;
		},
	) {
		return this.usersService.createUser(
			body.phone,
			body.passwordPlain,
			body.apartmentId,
		);
	}
}
