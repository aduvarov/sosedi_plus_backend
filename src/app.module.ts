import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ApartmentsModule } from './apartments/apartments.module';
import { TransactionsModule } from './transactions/transactions.module';
import { GlobalExpensesModule } from './global-expenses/global-expenses.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
	imports: [
		// Загружаем .env глобально самым первым!
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		PrismaModule,
		UsersModule,
		AuthModule,
		ApartmentsModule,
		TransactionsModule,
		GlobalExpensesModule,
		CategoriesModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
