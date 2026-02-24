import { Injectable } from '@nestjs/common';
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
}
