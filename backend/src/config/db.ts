import mongoose from 'mongoose';
import { setPreviewMode } from '../preview-mock';

export async function connectDB() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/vedaai';
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log('MongoDB connected');
  } catch (error: any) {
    console.warn(`\n⚠️ MongoDB connection failed: ${error.message}\n⚠️ Falling back to IN-MEMORY storage for preview mode.\n`);
    setPreviewMode();
  }
}
