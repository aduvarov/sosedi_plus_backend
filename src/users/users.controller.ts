import {
	Controller,
	Post,
	Body,
	UseGuards,
	Request,
	Patch,
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
		},
	) {
		return this.usersService.createUser(
			body.phone,
			body.passwordPlain,
			body.apartmentId,
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
}
