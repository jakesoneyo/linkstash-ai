import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { assertOwnership } from './ownership.util';

/**
 * assertOwnership 단위 테스트 — 멀티테넌시 격리(SPEC.md 성공 기준: 유저 A는
 * 유저 B의 링크를 조회 불가)의 핵심을 담당하는 순수 함수라 별도 검증한다.
 */
describe('assertOwnership', () => {
  it('리소스가 없으면 NotFoundException을 던진다', () => {
    expect(() => assertOwnership(null, 'user-1')).toThrow(NotFoundException);
  });

  it('리소스는 있지만 다른 유저 소유면 ForbiddenException을 던진다(존재 여부 숨기지 않음)', () => {
    const resource = { userId: 'owner' };
    expect(() => assertOwnership(resource, 'someone-else')).toThrow(
      ForbiddenException,
    );
  });

  it('요청자가 소유자와 같으면 리소스를 그대로 반환한다', () => {
    const resource = { userId: 'owner', id: 'link-1' };
    expect(assertOwnership(resource, 'owner')).toBe(resource);
  });
});
