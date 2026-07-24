import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Links 등 보호가 필요한 모든 컨트롤러에서 `@UseGuards(JwtAuthGuard)`로 재사용. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
