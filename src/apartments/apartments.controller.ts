import {
	Controller,
	Get,
	Param,
	ParseIntPipe,
	UseGuards,
} from '@nestjs/common';
import { ApartmentsService } from './apartments.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('apartments')
@UseGuards(AuthGuard('jwt')) // Защищаем все роуты в этом контроллере Access-токеном
export class ApartmentsController {
	constructor(private readonly apartmentsService: ApartmentsService) {}

	@Get()
	async getAllApartments() {
		return this.apartmentsService.findAll();
	}

	@Get(':id')
	async getApartmentById(@Param('id', ParseIntPipe) id: number) {
		return this.apartmentsService.findOne(id);
	}
}
