import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 배포 환경(Docker/Render)에서 컨테이너 liveness 체크용 엔드포인트.
 * DB까지 ping해 "앱은 떠 있지만 DB가 끊긴" 상태를 구분해낸다.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '헬스체크 (앱 + DB 연결 상태)' })
  async check(): Promise<{ status: 'ok'; db: 'up' }> {
    try {
      // 가장 저렴한 쿼리로 커넥션 유효성만 확인한다.
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'DB 연결 실패',
      });
    }
    return { status: 'ok', db: 'up' };
  }
}
