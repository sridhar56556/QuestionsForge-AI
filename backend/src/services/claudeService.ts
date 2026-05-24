import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

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

export async function generatePaper(assignment: any): Promise<any> {
  const prompt = `
Create a question paper for:
Subject: ${assignment.subject}
Grade: ${assignment.grade}
Total Questions: ${assignment.numberOfQuestions}
Total Marks: ${assignment.totalMarks}
Question Types: ${assignment.questionTypes.join(', ')}
Difficulty: ${assignment.difficulty}
Additional Instructions: ${assignment.additionalInstructions || 'None'}
${assignment.fileContent ? "Reference Material: " + assignment.fileContent : ""}

Return ONLY valid JSON structure EXACTLY like this (NO markdown fencing, NO extra text):
{
  "sections": [
    {
      "title": "Section A",
      "instruction": "Attempt all questions",
      "questions": [
        {
          "number": 1,
          "text": "question text here",
          "type": "MCQ",
          "difficulty": "easy",
          "marks": 2,
          "options": ["A. opt1", "B. opt2", "C. opt3", "D. opt4"]
        }
      ]
    }
  ],
  "totalMarks": ${assignment.totalMarks}
}`;

  logDebug(`generatePaper: Prompt prepared. Total marks expected: ${assignment.totalMarks}`);

  // We go straight to Gemini instead of Claude as the Claude API key is invalid/401ing.
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    logDebug(`generatePaper: Attempting Gemini API fallback (Key status: ${apiKey ? "present" : "absent"})...`);
    if (!apiKey) {
      logDebug(`generatePaper: GEMINI_API_KEY is not configured. Falling back to local mock generator...`);
      return generateLocalMockPaper(assignment);
    }
    const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert educator. You MUST respond with valid JSON only. No markdown formatting, no explanations.",
        temperature: 0.2,
        responseMimeType: "application/json",
      }
    });
    logDebug(`generatePaper: Gemini API responded. Text preview length: ${response.text?.length || 0}`);
    return extractJSON(response.text || "{}");
  } catch (error: any) {
    logDebug(`generatePaper: Gemini API call failed, error details: ${error.message}. Falling back to local mock generator...`);
    try {
      return generateLocalMockPaper(assignment);
    } catch (fallbackErr: any) {
      logDebug(`generatePaper: Fallback mock generation failed: ${fallbackErr.message}`);
      throw error;
    }
  }
}

function generateLocalMockPaper(assignment: any): any {
  const numQuestions = assignment.numberOfQuestions || 5;
  const totalMarks = assignment.totalMarks || 50;
  const questionTypes = assignment.questionTypes && assignment.questionTypes.length > 0 ? assignment.questionTypes : ["MCQ", "Short Answer"];
  
  const marksPerQuestion = Math.max(1, Math.floor(totalMarks / numQuestions));
  const remainingMarks = totalMarks - (marksPerQuestion * numQuestions);
  
  const questions: any[] = [];
  for (let i = 1; i <= numQuestions; i++) {
    const qType = questionTypes[(i - 1) % questionTypes.length];
    const qMarks = i === numQuestions ? (marksPerQuestion + remainingMarks) : marksPerQuestion;
    
    let text = "";
    let options: string[] | undefined = undefined;
    
    if (qType === "MCQ") {
      text = `Which of the following is a key concept in ${assignment.subject || "this subject"} (Grade ${assignment.grade || "N/A"})?`;
      options = [
        "A. Primary Option A",
        "B. Secondary Option B",
        "C. Alternative Option C",
        "D. None of the above"
      ];
    } else if (qType === "True/False") {
      text = `True or False: ${assignment.subject || "The topic"} is fundamental to modern education.`;
      options = ["True", "False"];
    } else if (qType === "Short Answer") {
      text = `Briefly explain the primary application of ${assignment.subject || "this topic"} in daily life.`;
    } else {
      text = `Provide a detailed explanation and analysis of the main principles underlying ${assignment.subject || "this subject"}.`;
    }
    
    questions.push({
      number: i,
      text,
      type: qType,
      difficulty: assignment.difficulty || "medium",
      marks: qMarks,
      options
    });
  }
  
  const midPoint = Math.ceil(numQuestions / 2);
  const section1Questions = questions.slice(0, midPoint);
  const section2Questions = questions.slice(midPoint);
  
  const sections = [
    {
      title: "Section A",
      instruction: "Answer all the questions in this section.",
      questions: section1Questions
    }
  ];
  
  if (section2Questions.length > 0) {
    sections.push({
      title: "Section B",
      instruction: "Answer all the questions in this section.",
      questions: section2Questions
    });
  }
  
  return {
    sections,
    totalMarks
  };
}

function extractJSON(text: string) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\n/, '').replace(/\n```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[^\n]*\n/, '').replace(/\n```$/, '');
  }
  return JSON.parse(cleaned);
}

export async function analyzeReferenceMaterial(text: string): Promise<any> {
  const prompt = `
Analyze the following Reference Material and suggest the ideal configuration for an assessment/question paper based on it.
Analyze the actual content, subject matter, complexity, and topics.

Reference Material Content Preview (first 12000 characters):
${text.slice(0, 12000)}

You MUST suggest options matching these specifications:
1. title: A concise, descriptive title for the assessment (e.g., 'Python Data Types Quiz', 'Cell Biology Midterm').
2. subjectType: Choose EXACTLY one of the following predefined subjects: 'Java', 'Python', 'JavaScript', 'TypeScript', 'C++', 'HTML & CSS', 'SQL & Databases', 'Data Structures & Algorithms', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'English', or select 'Other' if it doesn't fit any.
3. customSubject: If and ONLY if you selected 'Other' for subjectType, provide the custom subject name (e.g., 'Machine Learning'). Otherwise, leave empty.
4. grade: Choose EXACTLY one of the following grades that fits the depth or complexity: '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'College'.
5. difficulty: Choose one of: 'easy', 'medium', 'hard', 'mixed'.
6. numberOfQuestions: A reasonable default number of questions (between 5 and 30).
7. totalMarks: A reasonable total marks (between 10 and 100).
8. additionalInstructions: A brief list of key covered topics and customized focus instructions based on the document.
9. proposedQuestions: An array of 3 to 5 realistic questions that can be generated directly from this document. Each should have 'text' and 'marks' properties, and optional 'options' array.

Return ONLY a valid JSON object matching the following structure (do NOT wrap with any HTML/markdown outside the JSON block):
{
  "title": "Assesment Title",
  "subjectType": "Python / Mathematics / Other",
  "customSubject": "if 'Other' is selected",
  "grade": "10 / College / etc",
  "difficulty": "easy / medium / hard / mixed",
  "numberOfQuestions": 10,
  "totalMarks": 50,
  "additionalInstructions": "Topics covered: ... Focus-areas: ...",
  "proposedQuestions": [
    {
      "text": "The question text?",
      "marks": 5,
      "options": ["A. x", "B. y", "C. z", "D. w"]
    }
  ]
}
`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert educational content analyzer. Only respond with valid JSON.",
        temperature: 0.2,
        responseMimeType: "application/json",
      }
    });

    return extractJSON(response.text || "{}");
  } catch (error: any) {
    console.error("Failed to analyze reference material with Gemini:", error);
    // Return safe fallback values
    return {
      title: "Extracted Reference Assessment",
      subjectType: "Other",
      customSubject: "",
      grade: "College",
      difficulty: "medium",
      numberOfQuestions: 10,
      totalMarks: 50,
      additionalInstructions: "Created from uploaded document.",
      proposedQuestions: []
    };
  }
}

