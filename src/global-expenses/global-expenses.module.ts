import { Module } from '@nestjs/common';
import { GlobalExpensesService } from './global-expenses.service';
import { GlobalExpensesController } from './global-expenses.controller';

@Module({
  providers: [GlobalExpensesService],
  controllers: [GlobalExpensesController]
})
export class GlobalExpensesModule {}
