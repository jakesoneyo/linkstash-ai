import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

/**
 * 요청 body/query를 Zod 스키마로 파싱하는 범용 검증 파이프.
 * class-validator 대신 Zod로 통일 — 프론트와 동일한 스키마를 재사용하기 위함(ARCHITECTURE.md 참고).
 * 컨트롤러 핸들러에 `@UsePipes(new ZodValidationPipe(schema))`로 스키마별 바인딩한다.
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      // 에러 규약(API.md): { statusCode, error, message } — message에 필드별 사유를 압축해 담는다.
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`)
        .join(', ');
      throw new BadRequestException(message);
    }
    return result.data;
  }
}
