import {
  createParamDecorator,
  ExecutionContext,
  HttpException,
} from '@nestjs/common';

export type SessionObject = {
  session: {
    session_id: string;
  };
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
};

export const Auth = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();

    const session = req.session as SessionObject | undefined;

    if (session) {
      return session;
    } else {
      throw new HttpException('Unauthorized', 401);
    }
  },
);
