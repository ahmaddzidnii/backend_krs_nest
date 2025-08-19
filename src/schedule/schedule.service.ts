import { Redis } from 'ioredis';
import { Logger } from 'winston';
import { Prisma } from '@prisma/client';
import { Inject, Injectable } from '@nestjs/common';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

import { PrismaService } from '../common/prisma.service';
import { minutesToTimeString } from '../common/utils/time-utils';
import { ClassOfferingList, ClassStatusBatch } from './schedule.response';

@Injectable()
export class ScheduleService {
  private readonly redis: Redis;
  private readonly CACHE_EXPIRATION = 3600; // 1 hour in seconds

  @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger;

  constructor(
    private readonly prismaService: PrismaService,
    redisService: RedisService,
  ) {
    this.redis = redisService.getOrThrow();
  }

  /**
   * Safe Redis operation with error handling and logging
   */
  private async safeRedisOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: Record<string, any> = {},
  ): Promise<T | null> {
    try {
      this.logger.debug(`Redis: Executing ${operationName}`, context);
      const result = await operation();
      this.logger.debug(`Redis: ${operationName} completed successfully`, {
        ...context,
        hasResult: result !== null && result !== undefined,
      });
      return result;
    } catch (error) {
      this.logger.error(`Redis: ${operationName} failed`, {
        error: error.message,
        stack: error.stack,
        redisStatus: this.redis.status,
        ...context,
      });
      return null;
    }
  }

  /**
   * Performance measurement utility
   */
  private async measurePerformance<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: Record<string, any> = {},
  ): Promise<T> {
    const startTime = Date.now();
    this.logger.debug(`Performance: Starting ${operationName}`, {
      ...context,
      startTime: new Date(startTime).toISOString(),
    });

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      if (duration > 1000) {
        this.logger.warn(
          `Performance: ${operationName} took longer than expected`,
          {
            ...context,
            duration: `${duration}ms`,
            threshold: '1000ms',
          },
        );
      } else {
        this.logger.info(`Performance: ${operationName} completed`, {
          ...context,
          duration: `${duration}ms`,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Performance: ${operationName} failed`, {
        ...context,
        duration: `${duration}ms`,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Mengambil jadwal kelas yang ditawarkan untuk kurikulum tertentu pada periode aktif,
   * lalu mengelompokkannya berdasarkan semester paket.
   * @param idKurikulum ID dari kurikulum yang ingin ditampilkan.
   * @param semesterPaket (Opsional) Filter untuk semester paket tertentu.
   */
  async getClassScheduleOffered(
    idKurikulum: string,
    semesterPaket?: number,
  ): Promise<ClassOfferingList> {
    const methodName = 'getClassScheduleOffered';
    const cacheKey = `class-schedule:${idKurikulum}:${semesterPaket || 'all'}`;

    this.logger.info(`${methodName} called`, {
      idKurikulum,
      semesterPaket,
      cacheKey,
    });

    try {
      // Attempt to get data from Redis cache
      this.logger.debug(
        `${methodName}: Attempting to get cache for key: ${cacheKey}`,
      );
      const cachedData = await this.safeRedisOperation(
        () => this.redis.get(cacheKey),
        'GET cache',
        { cacheKey },
      );

      if (cachedData) {
        this.logger.info(`${methodName}: Cache HIT for key: ${cacheKey}`, {
          cacheKey,
          dataSize: cachedData.length,
        });
        try {
          return JSON.parse(cachedData);
        } catch (parseError) {
          this.logger.error(`${methodName}: Failed to parse cached data`, {
            error: parseError.message,
            cacheKey,
            cachedDataLength: cachedData.length,
          });
        }
      }

      // Continue to fetch from database if cache data is corrupted
      this.logger.info(`${methodName}: Cache MISS for key: ${cacheKey}`, {
        cacheKey,
      });

      // Build where clause for Prisma query
      const whereClause: Prisma.KelasDitawarkanWhereInput = {
        periodeAkademik: {
          is_active: true,
        },
        mataKuliah: {
          detailKurikulum: {
            some: {
              id_kurikulum: idKurikulum,
            },
          },
        },
      };

      if (semesterPaket !== undefined) {
        whereClause.mataKuliah.detailKurikulum.some.semester_paket =
          semesterPaket;
        this.logger.debug(
          `${methodName}: Filter applied for semester_paket: ${semesterPaket}`,
        );
      }

      this.logger.debug(`${methodName}: Executing database query`, {
        whereClause: JSON.stringify(whereClause, null, 2),
      });

      const kelasDitawarkan = await this.measurePerformance(
        () =>
          this.prismaService.kelasDitawarkan.findMany({
            where: whereClause,
            include: {
              mataKuliah: {
                include: {
                  detailKurikulum: {
                    include: {
                      kurikulum: true,
                    },
                  },
                },
              },
              dosenPengajarKelas: {
                include: {
                  dosen: {
                    select: { nip: true, nama: true },
                  },
                },
              },
              jadwalKelas: {
                select: {
                  hari: true,
                  waktu_mulai: true,
                  waktu_selesai: true,
                  ruang: true,
                },
              },
            },
          }),
        'Database Query - kelasDitawarkan.findMany',
        { idKurikulum, semesterPaket },
      );

      this.logger.info(`${methodName}: Database query completed`, {
        totalClasses: kelasDitawarkan.length,
        idKurikulum,
        semesterPaket,
      });

      if (kelasDitawarkan.length === 0) {
        this.logger.warn(`${methodName}: No classes found`, {
          idKurikulum,
          semesterPaket,
        });
      }

      // Group classes by semester
      const groupedBySemester = kelasDitawarkan.reduce((acc, kelas) => {
        const detailKurikulum = kelas.mataKuliah.detailKurikulum.find(
          (detail) => detail.id_kurikulum === idKurikulum,
        );

        if (!detailKurikulum) {
          this.logger.warn(
            `${methodName}: DetailKurikulum not found for class`,
            {
              kelasId: kelas.id_kelas,
              idKurikulum,
            },
          );
          return acc;
        }

        const semester = detailKurikulum.semester_paket;
        const semesterKey = String(semester);

        const kelasBaru = {
          id_kelas: kelas.id_kelas,
          kode_mata_kuliah: kelas.mataKuliah.kode_matkul,
          kode_kurikulum: detailKurikulum.kurikulum.kode_kurikulum,
          nama_mata_kuliah: kelas.mataKuliah.nama,
          jenis_mata_kuliah: detailKurikulum.jenis_matkul,
          sks: kelas.mataKuliah.sks,
          semester_paket: semester,
          nama_kelas: kelas.nama_kelas,
          dosen_pengajar: kelas.dosenPengajarKelas.map((pengajar) => ({
            nip_dosen: pengajar.dosen.nip,
            nama_dosen: pengajar.dosen.nama,
          })),
          jadwal: kelas.jadwalKelas.map((jadwal) => ({
            hari: jadwal.hari,
            waktu_mulai:
              jadwal.waktu_mulai != null
                ? minutesToTimeString(jadwal.waktu_mulai)
                : null,
            waktu_selesai:
              jadwal.waktu_selesai != null
                ? minutesToTimeString(jadwal.waktu_selesai)
                : null,
            ruangan: jadwal.ruang,
          })),
        };

        if (!acc[semesterKey]) {
          acc[semesterKey] = [];
        }
        acc[semesterKey].push(kelasBaru);

        return acc;
      }, {});

      const result = {
        semester_paket: groupedBySemester,
      };

      this.logger.debug(`${methodName}: Data processing completed`, {
        totalSemesters: Object.keys(groupedBySemester).length,
        semesterKeys: Object.keys(groupedBySemester),
      });

      // Cache the result in Redis
      const cacheSuccess = await this.safeRedisOperation(
        () =>
          this.redis.set(
            cacheKey,
            JSON.stringify(result),
            'EX',
            this.CACHE_EXPIRATION,
          ),
        'SET cache',
        {
          cacheKey,
          expirationSeconds: this.CACHE_EXPIRATION,
          dataSize: JSON.stringify(result).length,
        },
      );

      if (cacheSuccess) {
        this.logger.info(`${methodName}: Successfully cached result`, {
          cacheKey,
          expirationSeconds: this.CACHE_EXPIRATION,
        });
      } else {
        this.logger.warn(
          `${methodName}: Failed to cache result, continuing without cache`,
          {
            cacheKey,
          },
        );
      }

      this.logger.info(`${methodName}: Successfully completed`, {
        idKurikulum,
        semesterPaket,
        totalSemesters: Object.keys(groupedBySemester).length,
        executionTime: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      this.logger.error(`${methodName}: Unexpected error occurred`, {
        error: error.message,
        stack: error.stack,
        idKurikulum,
        semesterPaket,
        cacheKey,
      });
      throw error;
    }
  }

  /**
   * Mengambil status kelas berdasarkan ID kelas yang diberikan.
   * @param classIds Daftar ID kelas yang ingin diperiksa statusnya.
   * @param nim NIM mahasiswa untuk memeriksa apakah sudah terdaftar di kelas.
   */
  async getClassStatusBatch(
    classIds: string[],
    nim: string,
  ): Promise<ClassStatusBatch> {
    const methodName = 'getClassStatusBatch';

    this.logger.info(`${methodName} called`, {
      classIds,
      nim,
      totalClassIds: classIds.length,
    });

    try {
      if (!classIds || classIds.length === 0) {
        this.logger.warn(`${methodName}: No class IDs provided`, { nim });
        return {};
      }

      if (!nim) {
        this.logger.error(`${methodName}: NIM is required but not provided`, {
          classIds,
        });
        throw new Error('NIM is required');
      }

      this.logger.debug(`${methodName}: Executing database query`, {
        classIdsCount: classIds.length,
        nim,
      });

      const classesWithStatus = await this.measurePerformance(
        () =>
          this.prismaService.kelasDitawarkan.findMany({
            where: {
              id_kelas: {
                in: classIds,
              },
            },
            select: {
              id_kelas: true,
              kuota: true,
              terisi: true,
              // Mengecek apakah MAHASISWA INI sudah terdaftar di kelas untuk 'is_joined'
              detailKrs: {
                where: {
                  krs: {
                    mahasiswa: {
                      nim: nim,
                    },
                  },
                },
                // Kita hanya butuh tahu apakah relasinya ada, jadi select satu field saja sudah cukup
                select: {
                  id_krs: true,
                },
              },
            },
          }),
        'Database Query - getClassStatusBatch',
        { classIdsCount: classIds.length, nim },
      );

      this.logger.info(`${methodName}: Database query completed`, {
        totalClassesFound: classesWithStatus.length,
        requestedClassIds: classIds.length,
        nim,
      });

      // Check if some classes were not found
      const foundClassIds = classesWithStatus.map((kelas) => kelas.id_kelas);
      const missingClassIds = classIds.filter(
        (id) => !foundClassIds.includes(id),
      );

      if (missingClassIds.length > 0) {
        this.logger.warn(`${methodName}: Some classes not found in database`, {
          missingClassIds,
          nim,
          totalMissing: missingClassIds.length,
        });
      }

      const result = classesWithStatus.reduce((acc, kelas) => {
        const terisi = kelas.terisi;
        const kuota = kelas.kuota;
        const isFull = terisi >= kuota;
        const isJoined = kelas.detailKrs.length > 0;

        acc[kelas.id_kelas] = {
          id_kelas: kelas.id_kelas,
          is_full: isFull,
          is_joined: isJoined,
          kuota: kuota,
          terisi: terisi,
        };

        this.logger.debug(`${methodName}: Processed class status`, {
          idKelas: kelas.id_kelas,
          isFull,
          isJoined,
          kuota,
          terisi,
          nim,
        });

        return acc;
      }, {} as ClassStatusBatch);

      this.logger.info(`${methodName}: Successfully completed`, {
        totalProcessed: Object.keys(result).length,
        nim,
        executionTime: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      this.logger.error(`${methodName}: Unexpected error occurred`, {
        error: error.message,
        stack: error.stack,
        classIds,
        nim,
      });
      throw error;
    }
  }
}
