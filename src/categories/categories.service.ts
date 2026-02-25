import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
	constructor(private prisma: PrismaService) {}

	async findAll() {
		return this.prisma.category.findMany({ orderBy: { id: 'asc' } });
	}

	async create(name: string, isSystem: boolean = false) {
		return this.prisma.category.create({ data: { name, isSystem } });
	}

	// НОВЫЙ МЕТОД: УДАЛЕНИЕ КАТЕГОРИИ
	async remove(id: number) {
		// Запрещаем удалять системные категории (например, ID 1 - "Аванс")
		if (id === 1) {
			throw new BadRequestException(
				'Нельзя удалить базовую системную категорию',
			);
		}

		// Prisma автоматически выдаст ошибку, если мы попытаемся удалить категорию,
		// которая уже привязана к каким-то транзакциям (защита внешнего ключа).
		// Глобальный фильтр ошибок перехватит её и вернет пользователю.
		return this.prisma.category.delete({
			where: { id },
		});
	}
}
