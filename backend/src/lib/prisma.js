import { PrismaClient } from '../../generated/prisma/index.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { env } from '../config/env.js';

/**
 * Prisma 7 talks to the database through a driver adapter rather than a bundled
 * query engine, so the MySQL driver is configured explicitly here. The adapter
 * takes discrete fields, so the connection string is parsed once.
 */
function connectionOptions(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
    connectionLimit: 10,
  };
}

const globalForPrisma = globalThis;

/**
 * Created once and shared. In development nodemon reloads this module on every
 * save, so the instance is cached on globalThis to avoid opening a new
 * connection pool per reload.
 */
export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    adapter: new PrismaMariaDb(connectionOptions(env.DATABASE_URL)),
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV === 'development') {
  globalForPrisma.__prisma = prisma;
}
