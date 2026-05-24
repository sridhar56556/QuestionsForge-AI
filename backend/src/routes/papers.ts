import { Router } from 'express';
import QuestionPaperModel from '../models/QuestionPaper';
import AssignmentModel from '../models/Assignment';
import { generatePDF } from '../services/pdfService';
import { getRedisClient } from '../config/redis';
import { isPreviewMode, MockDB } from '../preview-mock';

const QuestionPaper = QuestionPaperModel as any;
const Assignment = AssignmentModel as any;

const router = Router();

router.get('/:assignmentId', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    if (isPreviewMode) {
      const paper = Array.from(MockDB.papers.values()).find(p => p.assignmentId === assignmentId);
      if (!paper) return res.status(404).json({ error: 'Not found' });
      return res.json(paper);
    }
    
    const redis = getRedisClient();
    if (redis) {
      const cached = await redis.get(`paper:${assignmentId}`);
      if (cached) return res.json(JSON.parse(cached));
    }
    
    const paper = await QuestionPaper.findOne({ assignmentId });
    if (!paper) return res.status(404).json({ error: 'Not found' });
    
    if (redis) {
      await redis.setex(`paper:${assignmentId}`, 3600, JSON.stringify(paper));
    }
    
    res.json(paper);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:assignmentId/pdf', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    let paper, assignment;
    
    if (isPreviewMode) {
      paper = Array.from(MockDB.papers.values()).find(p => p.assignmentId === assignmentId);
      assignment = MockDB.assignments.get(assignmentId);
    } else {
      paper = await QuestionPaper.findOne({ assignmentId });
      assignment = await Assignment.findById(assignmentId);
    }
    
    if (!paper || !assignment) return res.status(404).json({ error: 'Not found' });
    
    const pdfBuffer = await generatePDF(paper, assignment);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${assignment.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF error', error);
    res.status(500).json({ error: error.message || 'Failed to generate PDF' });
  }
});

export default router;
