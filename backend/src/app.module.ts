import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirestoreModule } from './firestore/firestore.module';
import { DiscordModule } from './discord/discord.module';

@Module({
  imports: [FirestoreModule, DiscordModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
