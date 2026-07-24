import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, AuthenticatedUser } from '../jwt-payload.type';

/**
 * Authorization: Bearer <token> 헤더를 검증해 요청 컨텍스트에 유저를 주입한다.
 * 서명/만료 검증은 passport-jwt가 자동 처리 — 실패 시 프레임워크가 401을 던진다.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /** 토큰이 유효할 때만 호출됨 — payload를 그대로 신뢰하지 않고 최소 필드만 매핑. */
  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
    return { id: payload.sub, email: payload.email };
  }
}
