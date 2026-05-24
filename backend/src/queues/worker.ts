import { generatePaper } from '../services/claudeService';
import AssignmentModel from '../models/Assignment';
import QuestionPaperModel from '../models/QuestionPaper';
import { getRedisClient } from '../config/redis';
import { getSocketEmitter } from '../socket';
import { isPreviewMode, MockDB, MockQueue } from '../preview-mock';
import { Worker } from 'bullmq';
import fs from 'fs';
import path from 'path';

const Assignment = AssignmentModel as any;
const QuestionPaper = QuestionPaperModel as any;

function logDebug(message: string) {
  try {
    const logPath = path.join(process.cwd(), 'backend', 'src', 'debug.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, 'utf8');
    console.log(`[DEBUG LOG] ${message}`);
  } catch (e) {
    console.error("Failed to write to debug log:", e);
  }
}

export async function processJob({ data }: { data: any }) {
  const { assignmentId } = data;
  logDebug(`processJob started for assignmentId: ${assignmentId}`);
  let io;
  try { io = getSocketEmitter(); } catch(e) {}
  
  try {
    let assignment;
    if (isPreviewMode) {
      logDebug(`In preview mode, fetching assignment from MockDB`);
      assignment = MockDB.assignments.get(assignmentId);
      if(assignment) {
        assignment.status = 'processing';
        logDebug(`Updated MockDB assignment status to processing`);
      }
    } else {
      logDebug(`In database mode, fetching assignment from MongoDB`);
      assignment = await Assignment.findById(assignmentId);
      if(assignment) {
        assignment.status = 'processing';
        await assignment.save();
        logDebug(`Updated MongoDB assignment status to processing and saved`);
      }
    }
    
    if(!assignment) {
      logDebug(`Assignment not found for ID: ${assignmentId}`);
      throw new Error('Assignment not found');
    }
    if (io) io.emit('job:processing', { assignmentId });

    logDebug(`Calling generatePaper for assignment: ${assignment.title}`);
    const paperJSON = await generatePaper(assignment);
    logDebug(`generatePaper completed successfully. Received result keys: ${Object.keys(paperJSON || {})}`);

    let paperId;
    if (isPreviewMode) {
      paperId = 'paper_' + Date.now();
      const paper = { _id: paperId, assignmentId, ...paperJSON, generatedAt: new Date() };
      MockDB.papers.set(paperId, paper);
      assignment.status = 'completed';
      logDebug(`Saved paper in MockDB paperId: ${paperId} and set assignment status to completed`);
    } else {
      logDebug(`Saving paper to MongoDB...`);
      const paper = new QuestionPaper({ assignmentId, ...paperJSON });
      await paper.save();
      paperId = paper._id.toString();
      logDebug(`Saved paper to MongoDB with ID: ${paperId}`);
      
      try {
        const redis = getRedisClient();
        if(redis) {
           logDebug(`Redis client found, setting cache...`);
           await redis.setex(`paper:${assignmentId}`, 3600, JSON.stringify(paper));
           logDebug(`Cache saved in Redis`);
        } else {
          logDebug(`No Redis client available for caching`);
        }
      } catch (redisError: any) {
        logDebug(`Redis caching failed (non-fatal): ${redisError.message}`);
      }
      
      assignment.status = 'completed';
      await assignment.save();
      logDebug(`Updated assignment status to completed and saved in MongoDB`);
    }
    
    if (io) {
      io.emit('job:completed', { assignmentId, paperId });
      logDebug(`Emitted job:completed event over WebSockets`);
    }
  } catch (error: any) {
    logDebug(`Job generation error encountered: ${error.message}\nStack: ${error.stack}`);
    console.error('Job generation error:', error);
    try {
      if (isPreviewMode) {
        const assignment = MockDB.assignments.get(assignmentId);
        if(assignment) assignment.status = 'failed';
        logDebug(`Updated MockDB assignment status to failed`);
      } else {
        await Assignment.findByIdAndUpdate(assignmentId, { status: 'failed' });
        logDebug(`Updated MongoDB assignment status to failed`);
      }
    } catch (dbErr: any) {
      logDebug(`Failed to set assignment status to failed in DB: ${dbErr.message}`);
    }
    if (io) io.emit('job:failed', { assignmentId, error: error.message });
  }
}

export function startWorker() {
  if (isPreviewMode) return;
  const redis = getRedisClient();
  if(!redis) return;

  const worker = new Worker('generationQueue', async (job) => {
    await processJob(job);
  }, { connection: redis });
  
  worker.on('error', (err) => {
    console.error('BullMQ Worker error:', err);
  });
  
  worker.on('failed', (job: any, err) => {
    console.error(`Job ${job?.id} failed with ${err.message}`);
  });
}

MockQueue.register(processJob);
