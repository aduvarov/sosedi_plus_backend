import {
	Controller,
	Post,
	Body,
	UseGuards,
	Request,
	Patch,
	Get,
	Delete,
	Param,
	ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';

// Определяем интерфейс для типизации Request (чтобы TypeScript видел req.user)
interface RequestWithJwt extends Request {
	user: { id: number; phone: string; role: string };
}

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
			fullName?: string;
		},
	) {
		return this.usersService.createUser(
			body.phone,
			body.passwordPlain,
			body.apartmentId,
			body.fullName,
		);
	}

	@Patch('change-password')
	async changePassword(
		@Request() req: RequestWithJwt, // Берем ID из токена, чтобы никто не поменял чужой пароль
		@Body() body: { oldPasswordPlain: string; newPasswordPlain: string },
	) {
		return this.usersService.changePassword(
			req.user.id,
			body.oldPasswordPlain,
			body.newPasswordPlain,
		);
	}
	// ПОЛУЧИТЬ СПИСОК ВСЕХ ЖИЛЬЦОВ (Только для Админа)
	@Get()
	@Roles(Role.ADMIN)
	async getAllUsers() {
		return this.usersService.findAllUsers();
	}

	// УДАЛИТЬ ЖИЛЬЦА (Только для Админа)
	@Delete(':id')
	@Roles(Role.ADMIN)
	async deleteUser(@Param('id', ParseIntPipe) id: number) {
		return this.usersService.deleteUser(id);
	}

	// РЕДАКТИРОВАТЬ ЖИЛЬЦА (Только для Админа)
	@Patch(':id')
	@Roles(Role.ADMIN)
	async updateUser(
		@Param('id', ParseIntPipe) id: number,
		@Body()
		body: {
			phone?: string;
			fullName?: string;
			passwordPlain?: string;
			apartmentId?: number;
		},
	) {
		return this.usersService.updateUser(id, body);
	}
}
