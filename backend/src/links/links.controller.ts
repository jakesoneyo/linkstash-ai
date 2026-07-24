import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt-payload.type';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { EnrichmentService } from '../enrichment/enrichment.service';
import { LinksService } from './links.service';
import { CreateLinkSchema } from './dto/create-link.dto';
import type { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkSchema } from './dto/update-link.dto';
import type { UpdateLinkDto } from './dto/update-link.dto';
import { ListLinksQuerySchema } from './dto/query-links.dto';
import type { ListLinksQuery } from './dto/query-links.dto';

/** 링크 CRUD — 전 엔드포인트 JWT 인증 + 소유권 검증(LinksService에서 처리). */
@ApiTags('links')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('links')
export class LinksController {
  private readonly logger = new Logger(LinksController.name);

  constructor(
    private readonly linksService: LinksService,
    private readonly enrichmentService: EnrichmentService,
  ) {}

  /** URL 저장 — PENDING으로 즉시 응답하고, 크롤링/요약은 백그라운드로 이어간다. */
  @Post()
  @ApiOperation({ summary: '링크 저장' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    // 파이프를 @Body() 파라미터에만 스코프 — 메서드 레벨 @UsePipes는 @CurrentUser() 등
    // 다른 파라미터에도 같은 스키마를 적용해버려 오작동한다.
    @Body(new ZodValidationPipe(CreateLinkSchema)) dto: CreateLinkDto,
  ) {
    const link = await this.linksService.create(user.id, dto);
    // fire-and-forget: 크롤링+LLM 왕복(수 초)을 기다리게 하지 않고 PENDING을 즉시 반환한다
    // (SPEC.md 성공 기준 "200ms 내 PENDING 응답"). enrich()는 내부에서 모든 실패를 흡수해
    // FAILED 상태로 기록하므로 던지지 않지만, 예기치 못한 버그로 인한 unhandled rejection을
    // 막기 위한 안전망으로 .catch를 둔다.
    this.enrichAndIgnore(link.id);
    return link;
  }

  /** 목록 조회 — 태그(다중 AND)/텍스트 검색/커서 페이지네이션 지원. */
  @Get()
  @ApiOperation({ summary: '링크 목록 조회' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(ListLinksQuerySchema)) query: ListLinksQuery,
  ) {
    return this.linksService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '링크 상세 조회' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.linksService.findOne(user.id, id);
  }

  /** 제목/태그 수동 수정. */
  @Patch(':id')
  @ApiOperation({ summary: '링크 수정' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateLinkSchema)) dto: UpdateLinkDto,
  ) {
    return this.linksService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: '링크 삭제' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.linksService.remove(user.id, id);
  }

  /** 실패했거나 다시 확인하고 싶은 링크를 PENDING으로 되돌리고 크롤링+LLM을 재실행한다. */
  @Post(':id/reprocess')
  @HttpCode(202)
  @ApiOperation({ summary: '링크 재처리(크롤링+요약 재실행)' })
  async reprocess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const link = await this.linksService.reprocess(user.id, id);
    this.enrichAndIgnore(link.id);
    return link;
  }

  /** enrich()는 내부에서 실패를 흡수하지만, 예기치 못한 예외가 unhandled rejection으로 새지 않도록 방어한다. */
  private enrichAndIgnore(linkId: string): void {
    this.enrichmentService.enrich(linkId).catch((err: Error) => {
      this.logger.error(
        `enrich 파이프라인에서 예기치 못한 예외: ${err.message}`,
      );
    });
  }
}
