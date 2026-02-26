import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApartmentsService {
	constructor(private prisma: PrismaService) {}

	async findAll() {
		const apartments = await this.prisma.apartment.findMany({
			orderBy: { number: 'asc' },
			include: {
				transactions: {
					include: {
						payments: true, // ВАЖНО: тянем связи, чтобы знать, оплачен ли счет
					},
				},
			},
		});

		return apartments.map((apt) => {
			// 1. Считаем свободный баланс (Кошелек - Категория 1)
			const walletBalance = apt.transactions
				.filter((tx) => tx.categoryId === 1)
				.reduce((sum, tx) => sum + tx.amount, 0);

			// 2. Считаем сумму активных долгов (Минус + Не кошелек + Нет оплат)
			const activeDebts = apt.transactions.filter(
				(tx) =>
					tx.amount < 0 &&
					tx.categoryId !== 1 &&
					tx.payments.length === 0,
			);
			// Берем по модулю (Math.abs), чтобы на фронтенд уходило положительное число долга
			const totalDebt = Math.abs(
				activeDebts.reduce((sum, tx) => sum + tx.amount, 0),
			);

			// Убираем массив транзакций из ответа, чтобы не перегружать сеть
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { transactions, ...apartmentData } = apt;

			return {
				...apartmentData,
				walletBalance,
				totalDebt,
			};
		});
	}

	async findOne(id: number) {
		const apt = await this.prisma.apartment.findUnique({
			where: { id },
			include: {
				transactions: {
					orderBy: { date: 'desc' },
					include: {
						category: true,
						globalExpense: true,
						payments: true, // <-- МАГИЯ ПРИСМЫ: сразу тянем привязанные оплаты!
					},
				},
			},
		});

		if (!apt) {
			throw new NotFoundException(`Квартира с ID ${id} не найдена`);
		}

		// 1. Считаем свободный баланс (Кошелек - Категория 1)
		const walletBalance = apt.transactions
			.filter((tx) => tx.categoryId === 1)
			.reduce((sum, tx) => sum + tx.amount, 0);

		// 2. Вычисляем активные долги (Минус + Не кошелек + Нет оплат)
		const activeDebts = apt.transactions.filter(
			(tx) =>
				tx.amount < 0 &&
				tx.categoryId !== 1 &&
				tx.payments.length === 0, // Если массив оплат пуст - значит долг висит!
		);

		const totalDebt = activeDebts.reduce((sum, tx) => sum + tx.amount, 0);

		// 3. Обогащаем историю транзакций статусами
		const enrichedTransactions = apt.transactions.map((tx) => {
			let paymentStatus: 'PAID' | 'UNPAID' | null = null;
			// Если это счет на оплату (минус не в кошельке)
			if (tx.amount < 0 && tx.categoryId !== 1) {
				paymentStatus = tx.payments.length > 0 ? 'PAID' : 'UNPAID';
			}

			// Убираем массив payments из ответа, чтобы не засорять JSON фронтенду
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { payments, ...cleanTx } = tx;

			return {
				...cleanTx,
				paymentStatus,
			};
		});

		return {
			...apt,
			walletBalance,
			totalDebt,
			activeDebts,
			transactions: enrichedTransactions,
		};
	}
}
