import { Link, Tag, TagsOnLinks } from '@prisma/client';

// N+1 방지를 위해 include로 한 번에 로드한 Link + 조인테이블 + Tag 형태.
export type LinkWithTags = Link & { tags: (TagsOnLinks & { tag: Tag })[] };

export interface LinkDto {
  id: string;
  url: string;
  title: string | null;
  ogImage: string | null;
  summary: string | null;
  status: string;
  failReason: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** API.md LinkDto 응답 형태로 평탄화 — 조인테이블 구조를 클라이언트에 노출하지 않는다. */
export function toLinkDto(link: LinkWithTags): LinkDto {
  return {
    id: link.id,
    url: link.url,
    title: link.title,
    ogImage: link.ogImage,
    summary: link.summary,
    status: link.status,
    failReason: link.failReason,
    tags: link.tags.map((t) => t.tag.name),
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
}
