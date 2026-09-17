import Redis, { RedisOptions } from "ioredis";

let _redis: Redis | null = null;
let _redisAvailable = false;
let _connectionAttempted = false;

// Fallback in-memory map if Redis is not configured or unreachable
const fallbackMap = new Map<string, { count: number; lockUntil: number }>();

export function getRedisClient(): Redis | null {
  if (_redis) return _redis;
  if (_connectionAttempted) return _redisAvailable ? _redis : null;

  const host = process.env.REDIS_HOST;
  if (!host) {
    _connectionAttempted = true;
    _redisAvailable = false;
    return null;
  }

  try {
    const port = Number(process.env.REDIS_PORT) || 6379;
    const password = process.env.REDIS_PASSWORD || undefined;
    // Default to DB 2 to strictly avoid collision with existing Laravel DB 0
    const db = Number(process.env.REDIS_DB) || 2;
    // Strict prefixing
    const keyPrefix = process.env.REDIS_PREFIX || "maulid_app:";

    const options: RedisOptions = {
      host,
      port,
      password,
      db,
      keyPrefix,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: (times) => {
        if (times > 3) {
          _redisAvailable = false;
          return null;
        }
        return Math.min(times * 100, 1000);
      },
    };

    _redis = new Redis(options);
    _redis.on("error", (err) => {
      console.warn("[Redis] Connection warning:", err.message);
      _redisAvailable = false;
    });
    _redis.on("connect", () => {
      _redisAvailable = true;
    });

    _connectionAttempted = true;
    // Trigger lazy connect in background
    _redis.connect().catch(() => {
      _redisAvailable = false;
    });

    return _redis;
  } catch (err) {
    console.warn("[Redis] Initialization failed, using in-memory fallback:", err);
    _connectionAttempted = true;
    _redisAvailable = false;
    return null;
  }
}

export async function getFailedLogin(
  key: string
): Promise<{ count: number; lockUntil: number } | null> {
  const client = getRedisClient();
  if (client && _redisAvailable) {
    try {
      const data = await client.get(`ratelimit:${key}`);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch {
      // Fallback
    }
  }
  return fallbackMap.get(key) || null;
}

export async function recordFailedLogin(
  key: string,
  count: number,
  lockUntil: number
): Promise<void> {
  const client = getRedisClient();
  if (client && _redisAvailable) {
    try {
      const payload = JSON.stringify({ count, lockUntil });
      // Store with 15 minutes expiration
      await client.set(`ratelimit:${key}`, payload, "EX", 900);
      return;
    } catch {
      // Fallback
    }
  }
  fallbackMap.set(key, { count, lockUntil });
}

export async function resetFailedLogin(key: string): Promise<void> {
  const client = getRedisClient();
  if (client && _redisAvailable) {
    try {
      await client.del(`ratelimit:${key}`);
      return;
    } catch {
      // Fallback
    }
  }
  fallbackMap.delete(key);
}
