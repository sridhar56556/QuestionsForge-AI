import Redis from 'ioredis';
import { isPreviewMode } from '../preview-mock';

let redisClient: Redis | null = null;

export function getRedisClient() {
  if (isPreviewMode) return null;
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) return null; // stop retrying
        return Math.min(times * 50, 2000);
      }
    });
    redisClient.on('error', (err) => {
      console.warn('Redis connection failed (expected in preview environment).');
    });
  }
  
  if (redisClient && redisClient.status !== 'ready' && redisClient.status !== 'connect' && redisClient.status !== 'reconnecting') {
    return null;
  }
  return redisClient;
}
