import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { isPreviewMode, MockQueue } from '../preview-mock';

let queue: Queue | null = null;

export const addToGenerationQueue = async (data: any) => {
  if (isPreviewMode) {
    await MockQueue.add('generate', data);
    return;
  }
  
  try {
    if (!queue) {
      const redis = getRedisClient();
      if (redis) {
        queue = new Queue('generationQueue', { connection: redis });
        queue.on('error', (err) => {
          console.error('BullMQ Queue error:', err);
        });
      }
    }
    if (queue) {
      await queue.add('generate', data);
    } else {
      await MockQueue.add('generate', data);
    }
  } catch (err) {
    console.warn("BullMQ or Redis connection unavailable, falling back to in-memory generation:", err);
    await MockQueue.add('generate', data);
  }
}
