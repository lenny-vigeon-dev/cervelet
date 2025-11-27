import { Controller, Get, Post, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

interface WritePixelDto {
  x: number;
  y: number;
  color: number;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Post('write')
  async writePixel(
    @Body() body: WritePixelDto,
    @Headers('authorization') auth?: string,
  ) {
    // Validate authorization header
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      throw new HttpException('Missing Discord access token', HttpStatus.UNAUTHORIZED);
    }

    const accessToken = auth.split(' ')[1];
    if (!accessToken) {
      throw new HttpException('Missing Discord access token', HttpStatus.UNAUTHORIZED);
    }

    // Validate body
    if (typeof body.x !== 'number' || typeof body.y !== 'number' || typeof body.color !== 'number') {
      throw new HttpException('Invalid payload. Expected { x: number, y: number, color: number }', HttpStatus.BAD_REQUEST);
    }

    if (body.color < 0 || body.color > 0xFFFFFF) {
      throw new HttpException('Color must be between 0 and 16777215 (0xFFFFFF)', HttpStatus.BAD_REQUEST);
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
