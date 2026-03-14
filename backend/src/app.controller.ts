import { Controller, Get, Post, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

interface WritePixelDto {
  x: number;
  y: number;
  color: number;
}

interface FirebaseTokenDto {
  discordAccessToken: string;
}

@Controller()
export class AppController {
  private readonly maxX: number;
  private readonly maxY: number;

  constructor(private readonly appService: AppService) {
    const DEFAULT_MAX = 1000;
    const parsedX = parseInt(process.env.CANVAS_MAX_X || '', 10);
    const parsedY = parseInt(process.env.CANVAS_MAX_Y || '', 10);
    this.maxX = Number.isNaN(parsedX) ? DEFAULT_MAX : parsedX;
    this.maxY = Number.isNaN(parsedY) ? DEFAULT_MAX : parsedY;
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Post('auth/firebase-token')
  async getFirebaseToken(@Body() body: FirebaseTokenDto) {
    if (!body.discordAccessToken || typeof body.discordAccessToken !== 'string') {
      throw new HttpException('Missing discordAccessToken', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.appService.getFirebaseToken(body.discordAccessToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      const status =
        message.includes('Discord API error: 401') || message.includes('Failed to validate')
          ? HttpStatus.UNAUTHORIZED
          : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(message, status);
    }
  }

  @Post('write')
  async writePixel(
    @Body() body: WritePixelDto,
    @Headers('x-discord-token') discordToken?: string,
  ) {
    if (!discordToken) {
      throw new HttpException('Missing Discord access token', HttpStatus.UNAUTHORIZED);
    }

    const accessToken = discordToken;

    // Validate body
    if (typeof body.x !== 'number' || typeof body.y !== 'number' || typeof body.color !== 'number') {
      throw new HttpException('Invalid payload. Expected { x: number, y: number, color: number }', HttpStatus.BAD_REQUEST);
    }

    if (!Number.isInteger(body.color) || body.color < 0 || body.color > 0xFFFFFF) {
      throw new HttpException('Color must be an integer between 0 and 16777215 (0xFFFFFF)', HttpStatus.BAD_REQUEST);
    }

    // Validate coordinate bounds against canvas dimensions
    if (!Number.isInteger(body.x) || !Number.isInteger(body.y)) {
      throw new HttpException('Coordinates must be integers', HttpStatus.BAD_REQUEST);
    }

    if (body.x < 0 || body.x >= this.maxX || body.y < 0 || body.y >= this.maxY) {
      throw new HttpException(
        `Coordinates out of bounds. X must be 0-${this.maxX - 1}, Y must be 0-${this.maxY - 1}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Publish to Pub/Sub
    try {
      await this.appService.publishPixelWrite({
        x: body.x,
        y: body.y,
        color: body.color,
        accessToken,
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
