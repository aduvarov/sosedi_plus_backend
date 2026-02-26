import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GlobalExpensesService {
	constructor(private prisma: PrismaService) {}

	async create(data: {
		description?: string;
		totalAmount: number;
		categoryId: number;
		participatingApartmentIds: number[]; // Получаем список квартир
	}) {
		const {
			description,
			totalAmount,
			categoryId,
			participatingApartmentIds,
		} = data;

		// Защита от деления на ноль
		if (
			!participatingApartmentIds ||
			participatingApartmentIds.length === 0
		) {
			throw new BadRequestException(
				'Необходимо выбрать хотя бы одну квартиру для распределения расхода',
			);
		}

		// Считаем долю каждой квартиры
		const shareAmount = Math.ceil(
			totalAmount / participatingApartmentIds.length,
		);

		// Запускаем транзакцию БД (либо выполнится всё, либо ничего)
		return this.prisma.$transaction(async (prisma) => {
			// 1. Создаем запись об общем расходе
			const globalExpense = await prisma.globalExpense.create({
				data: {
					description,
					totalAmount,
					categoryId,
				},
			});

			// 2. Подготавливаем массив долгов (Ledger) для выбранных квартир
			const transactionsData = participatingApartmentIds.map(
				(apartmentId) => ({
					amount: -shareAmount, // ВАЖНО: Ставим минус, так как это начисление долга
					description: `Доля за: ${description || 'Общий расход'}`,
					apartmentId,
					categoryId,
					globalExpenseId: globalExpense.id, // Привязываем долг к конкретному акту выполненных работ
				}),
			);

			// 3. Массово создаем долги в нашей таблице Transaction
			await prisma.transaction.createMany({
				data: transactionsData,
			});

			return globalExpense;
		});
	}

	async findAll() {
		const expenses = await this.prisma.globalExpense.findMany({
			orderBy: { date: 'desc' },
			include: {
				category: true,
				transactions: {
					include: {
						apartment: true, // Подтягиваем данные квартиры для светофора
					},
				},
			},
		});

		return expenses.map((expense) => {
			let collectedAmount = 0;
			// Создаем карту статусов для каждой квартиры участника
			const apartmentStatuses: Record<
				number,
				{ id: number; number: number; isPaid: boolean }
			> = {};

			expense.transactions.forEach((tx) => {
				// Инициализируем квартиру, если ее еще нет в списке
				if (!apartmentStatuses[tx.apartmentId]) {
					apartmentStatuses[tx.apartmentId] = {
						id: tx.apartment.id,
						number: tx.apartment.number,
						isPaid: false, // По умолчанию все должны
					};
				}

				// Если транзакция положительная — это оплата!
				if (tx.amount > 0) {
					collectedAmount += tx.amount;
					apartmentStatuses[tx.apartmentId].isPaid = true; // Зажигаем зеленый свет
				}
			});

			// Превращаем объект в массив и сортируем по номеру квартиры
			const participants = Object.values(apartmentStatuses).sort(
				(a, b) => a.number - b.number,
			);

			// Считаем прогресс (от 0 до 1) для полоски
			const progress =
				expense.totalAmount > 0
					? collectedAmount / expense.totalAmount
					: 0;

			// Убираем сырые транзакции, чтобы не гонять лишний вес на мобилку
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { transactions, ...expenseData } = expense;

			return {
				...expenseData,
				collectedAmount,
				progress,
				participants,
			};
		});
	}
}
