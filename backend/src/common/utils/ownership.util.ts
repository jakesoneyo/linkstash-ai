import { ForbiddenException, NotFoundException } from '@nestjs/common';

/**
 * 요청 유저와 리소스 소유자를 대조해 멀티테넌시 격리를 강제하는 공용 유틸.
 * links(Stage 2) 외에 소유권 검증이 필요한 모든 리소스에서 재사용한다.
 *
 * @param resource - 조회된 리소스(null이면 존재하지 않음 → 404)
 * @param requesterId - 요청한 유저 id(JWT payload의 sub)
 * @throws NotFoundException 리소스가 없을 때
 * @throws ForbiddenException 리소스는 있지만 다른 유저 소유일 때
 */
export function assertOwnership<T extends { userId: string }>(
  resource: T | null,
  requesterId: string,
): T {
  if (!resource) {
    throw new NotFoundException('리소스를 찾을 수 없습니다.');
  }
  if (resource.userId !== requesterId) {
    // 존재 여부를 숨기지 않고 403으로 명시 — API.md 에러 규약(403 타인 리소스)을 따른다.
    throw new ForbiddenException('본인 소유의 리소스가 아닙니다.');
  }
  return resource;
}
