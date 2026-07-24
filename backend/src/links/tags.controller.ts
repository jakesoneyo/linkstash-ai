import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt-payload.type';
import { LinksService } from './links.service';

/** 유저 태그 사전 — 필터 UI에서 태그별 링크 개수를 함께 보여주기 위한 전용 엔드포인트. */
@ApiTags('tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tags')
export class TagsController {
  constructor(private readonly linksService: LinksService) {}

  @Get()
  @ApiOperation({ summary: '내 태그 목록(링크 개수 포함)' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.linksService.listTags(user.id);
  }
}
