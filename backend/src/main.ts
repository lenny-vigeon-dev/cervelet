import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Preserve raw body bytes for Discord Ed25519 signature verification
    rawBody: true,
  });

  // Enable CORS -- restrict origin in production via CORS_ORIGIN env var.
  // When origin is '*', credentials must be omitted (browsers reject
  // Access-Control-Allow-Credentials: true with a wildcard origin).
  const configuredOrigin = process.env.CORS_ORIGIN || '*';
  app.use((req, res, next) => {
    const origin = configuredOrigin === '*' ? '*' : configuredOrigin;
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, x-api-key, X-Discord-Token');

    if (configuredOrigin !== '*') {
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Vary', 'Origin');
    }

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
    } else {
      next();
    }
  });

  const port = parseInt(process.env.PORT || '8080', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap().catch((err) => {
  console.error('Error during app bootstrap:', err);
  process.exit(1);
});
