import { Module } from '@nestjs/common';
import { EnrichmentModule } from '../enrichment/enrichment.module';
import { LinksController } from './links.controller';
import { TagsController } from './tags.controller';
import { LinksService } from './links.service';

@Module({
  imports: [EnrichmentModule],
  controllers: [LinksController, TagsController],
  providers: [LinksService],
})
export class LinksModule {}
