import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
	imports: [
		UsersModule,
		PassportModule,
		JwtModule.register({}), // Оставляем пустым, настройки передаются внутри сервисов/стратегий
	],
	providers: [AuthService, LocalStrategy, JwtStrategy, JwtRefreshStrategy],
	controllers: [AuthController],
	exports: [AuthService],
})
export class AuthModule {}
