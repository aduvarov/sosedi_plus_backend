import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApartmentsService {
	constructor(private prisma: PrismaService) {}

	async findAll() {
		const apartments = await this.prisma.apartment.findMany({
			orderBy: { number: 'asc' },
			include: {
				transactions: true,
			},
		});

		return apartments.map((apt) => {
			// Идеально простой подсчет благодаря вашей Ledger-архитектуре:
			// просто суммируем все amount (минусы сами вычтутся, плюсы прибавятся)
			const balance = apt.transactions.reduce(
				(sum, tx) => sum + tx.amount,
				0,
			);

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { transactions, ...apartmentData } = apt;

			return {
				...apartmentData,
				balance, // Отдаем готовое число для фронтенда
			};
		});
	}

	async findOne(id: number) {
		const apt = await this.prisma.apartment.findUnique({
			where: { id },
			include: { transactions: true },
		});

		if (!apt) return null;

		const balance = apt.transactions.reduce(
			(sum, tx) => sum + tx.amount,
			0,
		);

		return { ...apt, balance };
	}
}
