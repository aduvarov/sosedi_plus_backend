import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Декоратор Global делает этот модуль доступным во всем приложении
@Module({
	providers: [PrismaService],
	exports: [PrismaService], // Экспортируем сервис, чтобы другие модули могли его использовать
})
export class PrismaModule {}
