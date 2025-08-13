import * as winston from 'winston';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { AppService } from './app.service';
import { KrsModule } from './krs/krs.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { DosenModule } from './dosen/dosen.module';
import { CommonModule } from './common/common.module';
import { AuthMiddleware } from './auth/auth.middleware';
import { ScheduleModule } from './schedule/schedule.module';
import { MahasiswaModule } from './mahasiswa/mahasiswa.module';
import { MatakuliahModule } from './matakuliah/matakuliah.module';
import { KrsScheduleMiddleware } from './common/krs-schedule.middleware';
import { PeriodService } from './common/period.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    WinstonModule.forRoot({
      format: winston.format.json(),
      level: 'debug',
      transports: [
        // Console log (warna + timestamp)
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.colorize({ all: true }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length
                ? JSON.stringify(meta)
                : '';
              return `[${timestamp}] [${level}] ${message} ${metaStr}`;
            }),
          ),
        }),

        // File log (JSON format)
        new winston.transports.File({
          filename: 'logs/app.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        config: {
          host: configService.get<string>('REDIS_HOST'),
          port: parseInt(configService.get<string>('REDIS_PORT'), 10),
          password: configService.get<string>('REDIS_PASSWORD'),
          tls: {},
        },
      }),
      inject: [ConfigService],
    }),
    CommonModule,
    AuthModule,
    KrsModule,
    MahasiswaModule,
    MatakuliahModule,
    DosenModule,
    ScheduleModule,
  ],
  controllers: [AppController],
  providers: [AppService, PeriodService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(KrsScheduleMiddleware).forRoutes('*');
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
