import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy
{
	constructor() {
		// Получаем URL из переменных окружения
		const connectionString = process.env.DATABASE_URL;

		// Настраиваем пул соединений и адаптер для Prisma 7
		const pool = new Pool({ connectionString });
		const adapter = new PrismaPg(pool);

		// Передаем адаптер в родительский класс PrismaClient
		super({ adapter });
	}

	async onModuleInit() {
		await this.$connect();
	}

	async onModuleDestroy() {
		await this.$disconnect();
	}
}
