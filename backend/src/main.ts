import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * 앱 부트스트랩: 전역 예외 필터, CORS, Swagger 문서(/api/docs)를 설정한다.
 * DTO 검증은 전역 파이프 대신 컨트롤러 핸들러별 ZodValidationPipe로 처리한다
 * (Zod 스키마는 라우트마다 다르므로 단일 전역 파이프로 강제할 수 없음).
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('linkstash-ai API')
    .setDescription(
      'URL을 저장하면 크롤링+LLM으로 요약/태그를 자동 생성하는 북마크 SaaS',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
