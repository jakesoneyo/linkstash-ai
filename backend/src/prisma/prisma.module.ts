import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaService를 앱 전역에서 재주입 없이 쓰도록 @Global로 공개.
 * DB 접근이 필요한 모든 모듈(auth/links/health)이 별도 import 없이 사용한다.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
