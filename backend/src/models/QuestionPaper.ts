import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionPaper extends Document {
  assignmentId: mongoose.Types.ObjectId | string;
  sections: {
    title: string;
    instruction: string;
    questions: {
      number: number;
      text: string;
      type: string;
      difficulty: string;
      marks: number;
      options?: string[];
    }[];
  }[];
  totalMarks: number;
  generatedAt: Date;
}

const QuestionPaperSchema: Schema = new Schema({
  assignmentId: { type: Schema.Types.Mixed, required: true },
  sections: [{
    title: String,
    instruction: String,
    questions: [{
      number: Number,
      text: String,
      type: { type: String },
      difficulty: String,
      marks: Number,
      options: [String]
    }]
  }],
  totalMarks: Number,
  generatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.QuestionPaper || mongoose.model<IQuestionPaper>('QuestionPaper', QuestionPaperSchema);
