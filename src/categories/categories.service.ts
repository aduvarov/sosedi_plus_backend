import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
	constructor(private prisma: PrismaService) {}

	// Получить все категории
	async findAll() {
		return this.prisma.category.findMany({
			orderBy: { id: 'asc' },
		});
	}

	// Создать новую категорию
	async create(name: string, isSystem: boolean = false) {
		return this.prisma.category.create({
			data: {
				name,
				isSystem,
			},
		});
	}
}
