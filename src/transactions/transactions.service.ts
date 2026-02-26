import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
	constructor(private prisma: PrismaService) {}

	async create(data: {
		amount: number;
		description?: string;
		apartmentId: number;
		categoryId: number;
	}) {
		// В будущем здесь можно добавить проверку существования квартиры и категории,
		// но пока доверяем данным от админа
		return this.prisma.transaction.create({
			data,
		});
	}

	// ПОГАШЕНИЕ КОНКРЕТНОГО СЧЕТА ИЗ СВОБОДНЫХ СРЕДСТВ
	async payDebtFromBalance(apartmentId: number, debtTransactionId: number) {
		// 1. Ищем саму транзакцию долга
		const debtTx = await this.prisma.transaction.findUnique({
			where: { id: debtTransactionId },
			include: { payments: true },
		});

		if (!debtTx) throw new NotFoundException('Долг не найден');
		if (debtTx.apartmentId !== apartmentId)
			throw new BadRequestException('Долг принадлежит другой квартире');
		if (debtTx.amount >= 0 || debtTx.categoryId === 1)
			throw new BadRequestException('Эта операция не является долгом');
		if (debtTx.payments.length > 0)
			throw new BadRequestException('Этот счет уже оплачен');

		const amountNeeded = Math.abs(debtTx.amount); // Сколько нужно денег

		// 2. Считаем, хватает ли денег в Кошельке (Категория 1)
		const walletTransactions = await this.prisma.transaction.aggregate({
			where: { apartmentId, categoryId: 1 },
			_sum: { amount: true },
		});

		const currentBalance = walletTransactions._sum.amount || 0;

		if (currentBalance < amountNeeded) {
			throw new BadRequestException(
				`Недостаточно средств. На балансе: ${currentBalance} ₸, требуется: ${amountNeeded} ₸`,
			);
		}

		// 3. Выполняем двойную проводку атомарно
		return this.prisma.$transaction(async (prisma) => {
			// Списание со свободного баланса
			const withdraw = await prisma.transaction.create({
				data: {
					amount: -amountNeeded,
					categoryId: 1, // Системный Кошелек
					apartmentId,
					description: `Списание средств для оплаты счета (ID: ${debtTx.id})`,
				},
			});

			// Оплата в нужную категорию
			const payment = await prisma.transaction.create({
				data: {
					amount: amountNeeded,
					categoryId: debtTx.categoryId,
					apartmentId,
					globalExpenseId: debtTx.globalExpenseId, // Наследуем связь со сбором
					linkedDebtId: debtTx.id, // МАГИЧЕСКАЯ СВЯЗКА!
					description: `Оплата счета: ${debtTx.description}`,
				},
			});

			return { withdraw, payment };
		});
	}
}
