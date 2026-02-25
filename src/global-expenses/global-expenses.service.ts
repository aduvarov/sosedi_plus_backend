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
		return this.prisma.globalExpense.findMany({
			orderBy: { date: 'desc' },
			include: {
				category: true,
				transactions: {
					select: {
						apartment: {
							select: { number: true },
						},
					},
				},
			},
		});
	}
}
