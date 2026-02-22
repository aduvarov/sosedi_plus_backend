import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
	providers: [UsersService],
	exports: [UsersService], // Отдаем наружу
})
export class UsersModule {}
