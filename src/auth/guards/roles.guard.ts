import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../generated/prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Описываем минимальный интерфейс того, что мы ожидаем увидеть в request
interface RequestWithUser {
	user?: {
		role: Role;
	};
}

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
			ROLES_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (!requiredRoles) {
			return true;
		}

		// Явно указываем тип (кастуем) возвращаемого объекта request
		const request = context.switchToHttp().getRequest<RequestWithUser>();
		const user = request.user;

		// Если пользователя по какой-то причине нет (хотя JwtGuard должен был его пропустить), запрещаем доступ
		if (!user) {
			return false;
		}

		return requiredRoles.some((role) => user.role === role);
	}
}
