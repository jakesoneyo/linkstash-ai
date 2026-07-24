import { Injectable } from '@nestjs/common';
import { LinkStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertOwnership } from '../common/utils/ownership.util';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { ListLinksQuery } from './dto/query-links.dto';
import { LinkDto, toLinkDto } from './link.mapper';
import { replaceLinkTags } from './tags.util';

// 목록 조회 시 태그를 링크당 개별 쿼리하지 않도록 항상 함께 로드(N+1 방지, DATA-MODEL.md 3절).
const LINK_WITH_TAGS_INCLUDE = {
  tags: { include: { tag: true } },
} satisfies Prisma.LinkInclude;

@Injectable()
export class LinksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * URL을 PENDING 상태로 즉시 저장한다.
   * 크롤링/LLM 요약(enrichment)은 이 서비스가 직접 호출하지 않는다 — LinksController가
   * 응답을 반환한 직후 EnrichmentService.enrich()를 fire-and-forget으로 트리거한다.
   */
  async create(userId: string, dto: CreateLinkDto): Promise<LinkDto> {
    const link = await this.prisma.link.create({
      data: { userId, url: dto.url },
      include: LINK_WITH_TAGS_INCLUDE,
    });
    return toLinkDto(link);
  }

  /**
   * 유저 소유 링크를 최신순 커서 페이지네이션으로 조회한다.
   * @param query - tags(다중 AND 필터), q(제목/요약 ILIKE 검색), cursor(마지막으로 받은 링크 id), limit
   */
  async findAll(
    userId: string,
    query: ListLinksQuery,
  ): Promise<{ items: LinkDto[]; nextCursor: string | null }> {
    const { tags, q, cursor, limit } = query;

    const where: Prisma.LinkWhereInput = {
      userId,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { summary: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(tags && tags.length > 0
        ? {
            // 태그 다중 AND: `every`는 "링크가 가진 태그 전부가 필터에 포함"이라는
            // 반대 의미(빈 태그 링크도 통과)라 부적합 — 태그별 `some` 조건을 AND로 묶어
            // "요청한 태그를 전부 보유"를 정확히 표현한다(DATA-MODEL.md 참고).
            AND: tags.map((name) => ({
              tags: { some: { tag: { name } } },
            })),
          }
        : {}),
    };

    // limit+1개를 가져와 다음 페이지 존재 여부를 판단 (별도 count 쿼리 없이 저비용으로 확인).
    const rows = await this.prisma.link.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: LINK_WITH_TAGS_INCLUDE,
    });

    const hasNext = rows.length > limit;
    const items = hasNext ? rows.slice(0, limit) : rows;
    const nextCursor = hasNext ? items[items.length - 1].id : null;

    return { items: items.map(toLinkDto), nextCursor };
  }

  async findOne(userId: string, id: string): Promise<LinkDto> {
    const link = await this.prisma.link.findUnique({
      where: { id },
      include: LINK_WITH_TAGS_INCLUDE,
    });
    return toLinkDto(assertOwnership(link, userId));
  }

  /**
   * 제목/태그를 수동 편집한다. tags가 오면 해당 링크의 태그를 "전체 교체"한다.
   * @throws NotFoundException | ForbiddenException 소유권 검증 실패 시
   */
  async update(
    userId: string,
    id: string,
    dto: UpdateLinkDto,
  ): Promise<LinkDto> {
    const existing = await this.prisma.link.findUnique({ where: { id } });
    assertOwnership(existing, userId);

    if (dto.tags) {
      await this.replaceTags(userId, id, dto.tags);
    }

    const updated = await this.prisma.link.update({
      where: { id },
      data: { ...(dto.title !== undefined ? { title: dto.title } : {}) },
      include: LINK_WITH_TAGS_INCLUDE,
    });
    return toLinkDto(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.link.findUnique({ where: { id } });
    assertOwnership(existing, userId);
    // TagsOnLinks는 Link onDelete: Cascade로 함께 정리됨.
    await this.prisma.link.delete({ where: { id } });
  }

  /** 유저의 태그 사전 — 각 태그가 걸린 링크 수를 함께 반환(필터 UI용). */
  async listTags(
    userId: string,
  ): Promise<{ id: string; name: string; count: number }[]> {
    const tags = await this.prisma.tag.findMany({
      where: { userId },
      include: { _count: { select: { links: true } } },
      orderBy: { name: 'asc' },
    });
    return tags.map((t) => ({ id: t.id, name: t.name, count: t._count.links }));
  }

  /**
   * 링크의 태그를 주어진 이름 목록으로 전체 교체한다.
   * upsert/정규화 로직은 EnrichmentService와 공유하는 tags.util로 위임(중복 방지).
   */
  private async replaceTags(
    userId: string,
    linkId: string,
    names: string[],
  ): Promise<void> {
    await this.prisma.$transaction((tx) =>
      replaceLinkTags(tx, userId, linkId, names),
    );
  }

  /**
   * 실패했던(또는 정상이던) 링크를 다시 PENDING으로 되돌려 재처리를 예약한다.
   * 실제 크롤링+요약 재실행은 컨트롤러가 EnrichmentService.enrich()를 fire-and-forget으로 호출한다.
   * @throws NotFoundException | ForbiddenException 소유권 검증 실패 시
   */
  async reprocess(userId: string, id: string): Promise<LinkDto> {
    const existing = await this.prisma.link.findUnique({ where: { id } });
    assertOwnership(existing, userId);

    const updated = await this.prisma.link.update({
      where: { id },
      data: { status: LinkStatus.PENDING, failReason: null },
      include: LINK_WITH_TAGS_INCLUDE,
    });
    return toLinkDto(updated);
  }
}
