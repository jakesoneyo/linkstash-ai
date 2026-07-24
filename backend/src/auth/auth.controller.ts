import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterSchema } from './dto/register.dto';
import type { RegisterDto } from './dto/register.dto';
import { LoginSchema } from './dto/login.dto';
import type { LoginDto } from './dto/login.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './jwt-payload.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** 신규 회원가입. 이메일 중복이면 409. */
  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  register(@Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /** 이메일/비밀번호 로그인. 성공 시 액세스 토큰 발급. */
  @Post('login')
  @HttpCode(200) // API.md 계약: 로그인은 Nest 기본값(201)이 아닌 200.
  @ApiOperation({ summary: '로그인' })
  login(@Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** 현재 로그인한 유저 정보 조회 — JWT 유효성 확인용으로도 쓰인다. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 정보 조회' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.findById(user.id);
  }
}
