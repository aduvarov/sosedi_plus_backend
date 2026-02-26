import {
	Controller,
	Get,
	Post,
	Body,
	UseGuards,
	Patch,
	Param,
} from '@nestjs/common';
import { GlobalExpensesService } from './global-expenses.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';

@Controller('global-expenses')
@UseGuards(AuthGuard('jwt'), RolesGuard) // Подключаем проверку JWT и Ролей для всего контроллера
export class GlobalExpensesController {
	constructor(
		private readonly globalExpensesService: GlobalExpensesService,
	) {}

	// ДОБАВИТЬ РАСХОД: Доступно ТОЛЬКО Админу
	@Post()
	@Roles(Role.ADMIN)
	async createExpense(
		@Body()
		body: {
			description?: string;
			totalAmount: number;
			categoryId: number;
			participatingApartmentIds: number[]; // Добавили массив ID
		},
	) {
		return this.globalExpensesService.create(body);
	}

	// ПОСМОТРЕТЬ РАСХОДЫ: Доступно всем жильцам (нет декоратора @Roles)
	@Get()
	async getAllExpenses() {
		return this.globalExpensesService.findAll();
	}

	// ЭНДПОИНТ ДЛЯ ИЗМЕНЕНИЯ СТАТУСА СБОРА
	@Patch(':id/toggle-status')
	@Roles(Role.ADMIN)
	async toggleStatus(@Param('id') id: string) {
		return this.globalExpensesService.toggleStatus(Number(id));
	}
}
