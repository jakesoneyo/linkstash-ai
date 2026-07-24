import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../jwt-payload.type';

type RequestWithUser = Request & { user: AuthenticatedUser };

/** JwtAuthGuard 통과 후 req.user(JwtStrategy.validate 반환값)를 핸들러 인자로 꺼내는 헬퍼. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
