import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';

@Controller('transactions')
// 1. Сначала проверяем JWT (пускаем только своих)
// 2. Затем проверяем Роль (пускаем только тех, кому можно)
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TransactionsController {
	constructor(private readonly transactionsService: TransactionsService) {}

	@Post()
	@Roles(Role.ADMIN) // Указываем, что доступ есть ТОЛЬКО у ADMIN
	async createTransaction(
		@Body()
		body: {
			amount: number;
			description?: string;
			apartmentId: number;
			categoryId: number;
		},
	) {
		return this.transactionsService.create(body);
	}

	// ЭНДПОИНТ ДЛЯ ОПЛАТЫ КОНКРЕТНОГО СЧЕТА
	@Post('pay-debt')
	@Roles(Role.ADMIN)
	async payDebtFromBalance(
		@Body()
		body: {
			apartmentId: number;
			debtTransactionId: number; // Теперь мы принимаем ID конкретной квитанции
		},
	) {
		return this.transactionsService.payDebtFromBalance(
			body.apartmentId,
			body.debtTransactionId,
		);
	}
}
