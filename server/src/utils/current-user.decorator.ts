import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUserPayload {
  userId: string;
  username: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtUserPayload | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtUserPayload | undefined;
  },
);
