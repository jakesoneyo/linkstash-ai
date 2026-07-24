import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * API.md 에러 규약({ statusCode, error, message })으로 모든 예외 응답을 통일한다.
 * HttpException이 아닌 예기치 못한 에러도 500으로 감싸 스택트레이스 유출을 막는다.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = isHttpException ? exception.getResponse() : null;
    const message = this.extractMessage(body, exception);
    const error = isHttpException
      ? (HttpStatus[statusCode] ?? exception.name)
      : 'Internal Server Error';

    if (!isHttpException) {
      // 예상 못한 예외만 서버 로그에 스택트레이스로 남긴다(클라이언트에는 노출 안 함).
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response.status(statusCode).json({ statusCode, error, message });
  }

  private extractMessage(body: unknown, exception: unknown): string {
    if (typeof body === 'string') return body;
    if (body && typeof body === 'object' && 'message' in body) {
      const m = body.message;
      return Array.isArray(m) ? m.join(', ') : String(m);
    }
    if (exception instanceof Error) return exception.message;
    return 'Internal server error';
  }
}
