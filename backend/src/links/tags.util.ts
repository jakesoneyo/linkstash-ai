import { Prisma } from '@prisma/client';

// 유저 스코프 태그 upsert(+링크 태그 전체 교체) 유틸.
// LinksService(수동 태그 편집)와 enrichment/EnrichmentService(LLM 자동 태깅)가 동일한
// upsert 로직을 공유해야 해서 순수 함수로 분리했다 — 두 모듈을 서로 import하지 않고도
// (순환 의존 없이) 재사용할 수 있게 하기 위함.

/**
 * 유저 스코프 태그를 upsert한다. `@@unique([userId, name])`을 신뢰해 INSERT ON CONFLICT로
 * 처리되지만, 동시 요청으로 인한 P2002 유니크 충돌 가능성에 대비해 실패 시 이미 생성된
 * 행을 다시 조회하는 방어 로직을 둔다.
 */
export async function upsertTag(
  tx: Prisma.TransactionClient,
  userId: string,
  name: string,
): Promise<string> {
  try {
    const tag = await tx.tag.upsert({
      where: { userId_name: { userId, name } },
      update: {},
      create: { userId, name },
    });
    return tag.id;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      const tag = await tx.tag.findUniqueOrThrow({
        where: { userId_name: { userId, name } },
      });
      return tag.id;
    }
    throw err;
  }
}

/**
 * 링크의 태그를 주어진 이름 목록으로 전체 교체한다(기존 연결 삭제 후 재생성).
 * 이름은 소문자/trim으로 정규화해 "React"/"react" 같은 사실상 동일 태그의 중복 생성을 막는다.
 */
export async function replaceLinkTags(
  tx: Prisma.TransactionClient,
  userId: string,
  linkId: string,
  names: string[],
): Promise<void> {
  const normalized = [
    ...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean)),
  ];

  const tagIds = await Promise.all(
    normalized.map((name) => upsertTag(tx, userId, name)),
  );
  await tx.tagsOnLinks.deleteMany({ where: { linkId } });
  if (tagIds.length > 0) {
    await tx.tagsOnLinks.createMany({
      data: tagIds.map((tagId) => ({ linkId, tagId })),
    });
  }
}
