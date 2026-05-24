import { Router } from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import fs from 'fs';
import os from 'os';
import path from 'path';
import AssignmentModel from '../models/Assignment';
import { addToGenerationQueue } from '../queues/generationQueue';
import { isPreviewMode, MockDB } from '../preview-mock';
import { randomUUID } from 'crypto';
import { analyzeReferenceMaterial } from '../services/claudeService';

const Assignment = AssignmentModel as any;

const router = Router();
const uploadDir = path.join(os.tmpdir(), "vedaai-uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

router.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    let fileContent = '';
    if (req.file) {
      if (req.file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(req.file.path);
        const parser = new PDFParse({ data: dataBuffer });
        const textResult = await parser.getText();
        fileContent = textResult.text || '';
      } else if (req.file.mimetype === 'text/plain') {
        fileContent = fs.readFileSync(req.file.path, 'utf8');
      }
      fs.unlinkSync(req.file.path);
    }

    if (!fileContent.trim()) {
      return res.status(400).json({ error: 'No text content found in file' });
    }

    const suggestions = await analyzeReferenceMaterial(fileContent);
    res.json({ suggestions });
  } catch (error: any) {
    console.error("Analysis route error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const data = req.body;
    let fileContent = '';
    
    if (req.file) {
      if (req.file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(req.file.path);
        const parser = new PDFParse({ data: dataBuffer });
        const textResult = await parser.getText();
        fileContent = textResult.text || '';
      } else if (req.file.mimetype === 'text/plain') {
        fileContent = fs.readFileSync(req.file.path, 'utf8');
      }
      fs.unlinkSync(req.file.path);
    }
    
    const assignData = {
      title: data.title,
      subject: data.subject,
      grade: data.grade,
      dueDate: new Date(data.dueDate),
      questionTypes: Array.isArray(data.questionTypes) ? data.questionTypes : String(data.questionTypes || '').split(','),
      numberOfQuestions: Number(data.numberOfQuestions),
      totalMarks: Number(data.totalMarks),
      difficulty: data.difficulty,
      additionalInstructions: data.additionalInstructions,
      fileContent,
      status: 'pending'
    };

    let assignmentId;
    
    if (isPreviewMode) {
      assignmentId = randomUUID();
      MockDB.assignments.set(assignmentId, { _id: assignmentId, ...assignData, createdAt: new Date() });
    } else {
      const assignment = new Assignment(assignData);
      await assignment.save();
      assignmentId = assignment._id.toString();
    }

    addToGenerationQueue({ assignmentId });

    res.json({ assignmentId });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    let assignment;
    if (isPreviewMode) {
      assignment = MockDB.assignments.get(req.params.id);
    } else {
      assignment = await Assignment.findById(req.params.id);
    }
    if (!assignment) return res.status(404).json({ error: 'Not found' });
    res.json(assignment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
