import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { timestampExtension } from '../../prisma/extensions';

dotenv.config();

export const prisma = new PrismaClient({}).$extends(timestampExtension);
