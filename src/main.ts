import morgan from 'morgan';
import { Logger } from 'winston';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { VersioningType } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';

function maskSensitive(body: any) {
  if (!body) return body;
  const sensitive = [
    'password',
    'confirmPassword',
    'confirm_password',
    'token',
    'secret',
  ];

  const clone = { ...body };
  for (const key of sensitive) {
    if (clone[key]) clone[key] = undefined;
  }
  return clone;
}

function setupMorgan(app: NestExpressApplication, logger: Logger) {
  morgan.token('body', (req: any) => {
    try {
      return JSON.stringify(maskSensitive(req.body));
    } catch {
      return '';
    }
  });

  const morganMiddleware = morgan(
    function (tokens, req, res) {
      return JSON.stringify({
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status: tokens.status(req, res),
        contentLength: tokens.res(req, res, 'content-length'),
        responseTime: `${tokens['response-time'](req, res)} ms`,
        body: tokens.body(req, res),
      });
    },
    {
      stream: {
        write(str) {
          const data = JSON.parse(str);
          logger.info('Incoming Request', data);
        },
      },
    },
  );

  app.use(morganMiddleware);
}

function commonConfiguration(app: NestExpressApplication) {
  app.enableShutdownHooks();

  app.set('trust proxy', true);

  app.getHttpAdapter().getInstance().disable('x-powered-by');

  app.getHttpAdapter().getInstance().disable('etag');

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://10.20.30.3:3000',
      'https://krs-dev.masako.my.id',
      'https://krs.masako.my.id',
    ],
    credentials: true,
  });
  app.use(cookieParser(process.env.COOKIE_SECRET || undefined));
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  commonConfiguration(app);

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const logger = app.get<Logger>(WINSTON_MODULE_PROVIDER);
  setupMorgan(app, logger);

  const configService = app.get(ConfigService);
  const port = configService.get('APP_PORT') || 1001;

  await app.listen(port);
}

bootstrap();
