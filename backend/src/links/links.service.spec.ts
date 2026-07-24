import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LinksService } from './links.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * LinksService 단위 테스트 — Prisma를 실제로 두드리지 않고(findAll은 통합 테스트가 커버)
 * "태그 다중 AND 필터가 올바른 where 절로 조립되는지"와 "소유권 위반 시 403을 던지는지"만
 * 저비용으로 검증한다. 목록/CRUD 전체 흐름 검증은 test/의 Testcontainers 통합 테스트 담당.
 */
describe('LinksService', () => {
  // findMany 인자 타입을 제네릭으로 고정해 mock.calls 접근이 any로 새지 않게 한다.
  type FindManyMock = jest.Mock<Promise<unknown[]>, [Prisma.LinkFindManyArgs]>;

  function buildService(findManyResult: unknown[] = []) {
    const findMany: FindManyMock = jest
      .fn<Promise<unknown[]>, [Prisma.LinkFindManyArgs]>()
      .mockResolvedValue(findManyResult);
    const prisma = {
      link: { findMany, findUnique: jest.fn() },
    } as unknown as PrismaService;
    const service = new LinksService(prisma);
    return { service, findMany, prisma };
  }

  /** findMany에 실제로 전달된 where 절을 꺼내오는 헬퍼. */
  function whereFromCall(findMany: FindManyMock): Prisma.LinkWhereInput {
    return findMany.mock.calls[0][0].where ?? {};
  }

  describe('findAll — 태그 필터 AND 로직', () => {
    it('태그가 없으면 where에 tags 조건을 추가하지 않는다', async () => {
      const { service, findMany } = buildService();

      await service.findAll('user-1', {
        limit: 20,
        tags: undefined,
        q: undefined,
        cursor: undefined,
      });

      const where = whereFromCall(findMany);
      expect(where).toEqual({ userId: 'user-1' });
    });

    it('태그 여러 개를 넘기면 태그별 some 조건을 AND로 묶는다(전부 보유해야 매칭)', async () => {
      const { service, findMany } = buildService();

      await service.findAll('user-1', {
        limit: 20,
        tags: ['react', '면접'],
        q: undefined,
        cursor: undefined,
      });

      const where = whereFromCall(findMany);
      // every가 아닌 태그별 AND 배열이어야 "요청한 태그를 전부 보유"를 정확히 표현한다.
      expect(where.AND).toEqual([
        { tags: { some: { tag: { name: 'react' } } } },
        { tags: { some: { tag: { name: '면접' } } } },
      ]);
    });

    it('q가 있으면 title/summary ILIKE OR 조건을 추가한다', async () => {
      const { service, findMany } = buildService();

      await service.findAll('user-1', {
        limit: 20,
        tags: undefined,
        q: 'react',
        cursor: undefined,
      });

      const where = whereFromCall(findMany);
      expect(where.OR).toEqual([
        { title: { contains: 'react', mode: 'insensitive' } },
        { summary: { contains: 'react', mode: 'insensitive' } },
      ]);
    });
  });

  describe('findOne — 소유권 가드', () => {
    it('다른 유저 소유 링크를 조회하면 ForbiddenException을 던진다', async () => {
      const { service, prisma } = buildService();
      (prisma.link.findUnique as jest.Mock).mockResolvedValue({
        id: 'link-1',
        userId: 'owner',
        tags: [],
      });

      await expect(service.findOne('someone-else', 'link-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
