import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// 해시 비용 — 시연/개발 환경 응답 속도와 보안 사이 통상적 절충값.
const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * 이메일+비밀번호로 신규 유저를 생성한다.
   * @throws ConflictException 이미 가입된 이메일(API.md: 409)
   */
  async register(dto: RegisterDto): Promise<{ id: string; email: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash },
    });
    return { id: user.id, email: user.email };
  }

  /**
   * 이메일/비밀번호를 검증하고 액세스 토큰을 발급한다.
   * @throws UnauthorizedException 이메일 미존재 또는 비밀번호 불일치(API.md: 401) — 둘을 구분하지 않아 계정 존재 여부 노출을 막는다.
   */
  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    const isValid =
      user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!isValid || !user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });
    return { accessToken };
  }

  async findById(id: string): Promise<{ id: string; email: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    return { id: user.id, email: user.email };
  }
}
