import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';

@Controller('categories')
@UseGuards(AuthGuard('jwt'), RolesGuard) // Защита для всех роутов
export class CategoriesController {
	constructor(private readonly categoriesService: CategoriesService) {}

	// СПИСОК: Доступен всем авторизованным пользователям
	@Get()
	async getAll() {
		return this.categoriesService.findAll();
	}

	// СОЗДАНИЕ: Доступно ТОЛЬКО Админу
	@Post()
	@Roles(Role.ADMIN)
	async createCategory(@Body() body: { name: string; isSystem?: boolean }) {
		return this.categoriesService.create(body.name, body.isSystem);
	}
}
