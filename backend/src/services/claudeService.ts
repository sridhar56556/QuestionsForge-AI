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

const LOCAL_QUESTION_BANK: Record<string, { text: string; type: string; options?: string[] }[]> = {
  "python": [
    { text: "What is the output of print(type([])) in Python?", type: "MCQ", options: ["A. <class 'list'>", "B. <class 'dict'>", "C. <class 'tuple'>", "D. <class 'set'>"] },
    { text: "Which keyword is used to define a function in Python?", type: "MCQ", options: ["A. function", "B. def", "C. define", "D. func"] },
    { text: "Which of the following functions converts a string to a float in Python?", type: "MCQ", options: ["A. str()", "B. float()", "C. int()", "D. num()"] },
    { text: "What is the correct way to import a module named 'math'?", type: "MCQ", options: ["A. include math", "B. import math", "C. using math", "D. load math"] },
    { text: "True or False: Python tuples are mutable.", type: "True/False", options: ["True", "False"] },
    { text: "True or False: Indentation in Python is purely for readability and doesn't affect code execution.", type: "True/False", options: ["True", "False"] },
    { text: "Explain the difference between deep copy and shallow copy in Python.", type: "Short Answer" },
    { text: "Briefly describe the purpose of the '__init__' method in a Python class.", type: "Short Answer" },
    { text: "Describe how garbage collection works in Python, focusing on reference counting and cyclic references.", type: "Long Answer" },
    { text: "Write a Python program to explain the concept of decorators and list one practical use-case.", type: "Long Answer" }
  ],
  "java": [
    { text: "Which keyword is used to prevent method overriding in Java?", type: "MCQ", options: ["A. static", "B. final", "C. abstract", "D. private"] },
    { text: "What is the size of an int variable in Java?", type: "MCQ", options: ["A. 1 byte", "B. 2 bytes", "C. 4 bytes", "D. 8 bytes"] },
    { text: "Which class is the superclass of all classes in Java?", type: "MCQ", options: ["A. Object", "B. Class", "C. System", "D. String"] },
    { text: "True or False: In Java, strings are mutable objects.", type: "True/False", options: ["True", "False"] },
    { text: "True or False: Java supports multiple inheritance through classes.", type: "True/False", options: ["True", "False"] },
    { text: "Explain the purpose of the 'super' keyword in Java constructors and inheritance.", type: "Short Answer" },
    { text: "Briefly explain Java Garbage Collection and the role of the JVM.", type: "Short Answer" },
    { text: "Discuss the key differences between Interface and Abstract Class in Java with code examples.", type: "Long Answer" },
    { text: "Explain exception handling in Java. Describe the differences between Checked and Unchecked exceptions.", type: "Long Answer" }
  ],
  "javascript": [
    { text: "Which operator is used to compare both value and type in JavaScript?", type: "MCQ", options: ["A. ==", "B. ===", "C. =", "D. !="] },
    { text: "What is the result of typeof null in JavaScript?", type: "MCQ", options: ["A. 'null'", "B. 'undefined'", "C. 'object'", "D. 'string'"] },
    { text: "How do you declare a block-scoped variable in modern JavaScript?", type: "MCQ", options: ["A. var", "B. let", "C. define", "D. global"] },
    { text: "True or False: JavaScript is a single-threaded language.", type: "True/False", options: ["True", "False"] },
    { text: "True or False: 'const' variables in JavaScript cannot have their properties mutated.", type: "True/False", options: ["True", "False"] },
    { text: "Explain closure in JavaScript and give a short code example.", type: "Short Answer" },
    { text: "Briefly describe the difference between event bubbling and event capturing.", type: "Short Answer" },
    { text: "Detail the event loop mechanism in JavaScript. How does it handle async operations and microtasks?", type: "Long Answer" },
    { text: "Explain the differences between synchronous and asynchronous JavaScript, showcasing Promises and async/await.", type: "Long Answer" }
  ],
  "typescript": [
    { text: "Which TypeScript type represents the absence of any value?", type: "MCQ", options: ["A. void", "B. never", "C. null", "D. undefined"] },
    { text: "How do you declare a read-only property in a TypeScript interface?", type: "MCQ", options: ["A. readonly", "B. private", "C. const", "D. final"] },
    { text: "True or False: TypeScript types exist at runtime.", type: "True/False", options: ["True", "False"] },
    { text: "True or False: The 'any' type disables type checking for a variable in TypeScript.", type: "True/False", options: ["True", "False"] },
    { text: "Explain the difference between type aliases and interfaces in TypeScript.", type: "Short Answer" },
    { text: "What is the purpose of generics in TypeScript? Provide a quick code signature example.", type: "Short Answer" },
    { text: "Explain TypeScript utility types. Provide details on how Omit, Pick, and Partial work with examples.", type: "Long Answer" }
  ],
  "c++": [
    { text: "Which stream is used for standard input in C++?", type: "MCQ", options: ["A. cin", "B. cout", "C. cerr", "D. stdin"] },
    { text: "What operator is used to allocate dynamic memory in C++?", type: "MCQ", options: ["A. malloc", "B. new", "C. alloc", "D. create"] },
    { text: "True or False: C++ supports multiple inheritance.", type: "True/False", options: ["True", "False"] },
    { text: "True or False: Destructors in C++ can take arguments.", type: "True/False", options: ["True", "False"] },
    { text: "Explain the difference between pass-by-value and pass-by-reference in C++.", type: "Short Answer" },
    { text: "What is a virtual function in C++ and why is it used?", type: "Short Answer" },
    { text: "Discuss the Rule of Three (or Rule of Five) in C++ memory management, explaining destructors, copy constructors, and copy assignment operators.", type: "Long Answer" }
  ],
  "html & css": [
    { text: "Which HTML5 element is used to embed self-contained illustration content?", type: "MCQ", options: ["A. <figure>", "B. <picture>", "C. <canvas>", "D. <aside>"] },
    { text: "Which CSS property controls the layout order of flex items?", type: "MCQ", options: ["A. order", "B. flex-direction", "C. z-index", "D. align-self"] },
    { text: "True or False: The <script> tag should always be placed inside the <head> tag.", type: "True/False", options: ["True", "False"] },
    { text: "True or False: CSS Grid is primarily one-dimensional, whereas Flexbox is two-dimensional.", type: "True/False", options: ["True", "False"] },
    { text: "Explain the CSS Box Model, listing all of its layers.", type: "Short Answer" },
    { text: "Describe the differences between absolute, relative, fixed, and sticky positioning in CSS.", type: "Short Answer" },
    { text: "Discuss modern web accessibility practices (WCAG), detailing semantic HTML, aria-attributes, and keyboard navigation.", type: "Long Answer" }
  ],
  "sql & databases": [
    { text: "Which SQL clause is used to filter records within a group?", type: "MCQ", options: ["A. WHERE", "B. HAVING", "C. GROUP BY", "D. LIMIT"] },
    { text: "Which join returns all rows from the left table, and matched rows from the right?", type: "MCQ", options: ["A. INNER JOIN", "B. LEFT JOIN", "C. RIGHT JOIN", "D. OUTER JOIN"] },
    { text: "True or False: Primary keys automatically enforce a unique constraint.", type: "True/False", options: ["True", "False"] },
    { text: "True or False: Clustered indexes speed up write operations in a database table.", type: "True/False", options: ["True", "False"] },
    { text: "Explain the difference between a primary key and a foreign key constraint.", type: "Short Answer" },
    { text: "Briefly explain the ACID properties of a database transaction.", type: "Short Answer" },
    { text: "Discuss the differences between SQL (Relational) and NoSQL (Document-based) databases, outlining use cases for each.", type: "Long Answer" }
  ],
  "data structures & algorithms": [
    { text: "What is the worst-case time complexity of searching in a Binary Search Tree?", type: "MCQ", options: ["A. O(1)", "B. O(log n)", "C. O(n)", "D. O(n^2)"] },
    { text: "Which data structure operates on a First-In-First-Out (FIFO) basis?", type: "MCQ", options: ["A. Stack", "B. Queue", "C. Tree", "D. Heap"] },
    { text: "True or False: Array search time is O(1) if index is known.", type: "True/False", options: ["True", "False"] },
    { text: "True or False: Bubble Sort has an average-case time complexity of O(n log n).", type: "True/False", options: ["True", "False"] },
    { text: "Explain the difference between a tree and a graph data structure.", type: "Short Answer" },
    { text: "Explain how binary search works and state its time complexity.", type: "Short Answer" },
    { text: "Describe Dijkstra's Shortest Path algorithm. Detail its processing steps and complexity constraints.", type: "Long Answer" }
  ],
  "mathematics": [
    { text: "What is the derivative of f(x) = 3x^2 + 5x - 7 with respect to x?", type: "MCQ", options: ["A. 6x", "B. 6x + 5", "C. 3x + 5", "D. 6x^2 + 5"] },
    { text: "If 2x + 5 = 15, what is the value of x?", type: "MCQ", options: ["A. 5", "B. 10", "C. 7.5", "D. 4"] },
    { text: "What is the sum of the interior angles of a hexagon?", type: "MCQ", options: ["A. 360", "B. 540", "C. 720", "D. 900"] },
    { text: "True or False: The square root of a prime number is always irrational.", type: "True/False", options: ["True", "False"] },
    { text: "True or False: A matrix must be square to have an inverse.", type: "True/False", options: ["True", "False"] },
    { text: "State and explain the Pythagorean Theorem with a simple diagram description.", type: "Short Answer" },
    { text: "Explain the concept of standard deviation in statistics.", type: "Short Answer" },
    { text: "State the Fundamental Theorem of Calculus. Explain the relationship it establishes between differentiation and integration.", type: "Long Answer" }
  ],
  "physics": [
    { text: "What is the SI unit of electric current?", type: "MCQ", options: ["A. Volt", "B. Ampere", "C. Ohm", "D. Watt"] },
    { text: "According to Newton's second law, force equals mass multiplied by what?", type: "MCQ", options: ["A. Velocity", "B. Acceleration", "C. Displacement", "D. Time"] },
    { text: "True or False: Light travels faster in glass than in a vacuum.", type: "True/False", options: ["True", "False"] },
    { text: "True or False: Acceleration is a vector quantity.", type: "True/False", options: ["True", "False"] },
    { text: "State Newton's First Law of Motion and give a practical example.", type: "Short Answer" },
    { text: "Explain the difference between weight and mass.", type: "Short Answer" },
    { text: "Describe the photoelectric effect. Explain why classical physics failed to account for it, and how Einstein solved it.", type: "Long Answer" }
  ],
  "chemistry": [
    { text: "What is the chemical formula of Sodium Chloride?", type: "MCQ", options: ["A. NaCl", "B. H2O", "C. CO2", "D. HCl"] },
    { text: "What is the pH of a neutral solution?", type: "MCQ", options: ["A. 0", "B. 7", "C. 14", "D. 1"] },
    { text: "True or False: Helium is a reactive halogen gas.", type: "True/False", options: ["True", "False"] },
    { text: "True or False: Covalent bonds involve the sharing of electrons.", type: "True/False", options: ["True", "False"] },
    { text: "Explain the difference between endothermic and exothermic chemical reactions.", type: "Short Answer" },
    { text: "Briefly explain the concept of isotopes with an example.", type: "Short Answer" },
    { text: "Explain the Periodic Law. Describe how electronegativity, atomic radius, and ionization energy vary across the periodic table.", type: "Long Answer" }
  ],
  "biology": [
    { text: "What is the power house of the cell?", type: "MCQ", options: ["A. Ribosome", "B. Chloroplast", "C. Mitochondria", "D. Nucleus"] },
    { text: "Which pigment gives plants their green color?", type: "MCQ", options: ["A. Carotene", "B. Chlorophyll", "C. Melanin", "D. Hemoglobin"] },
    { text: "True or False: DNA is a single-stranded molecule.", type: "True/False", options: ["True", "False"] },
    { text: "True or False: Red blood cells contain a nucleus when mature.", type: "True/False", options: ["True", "False"] },
    { text: "Describe the function of red blood cells in the human circulatory system.", type: "Short Answer" },
    { text: "What is homeostasis? Provide one example in the human body.", type: "Short Answer" },
    { text: "Explain the process of photosynthesis in detail, listing both light-dependent and Calvin cycle stages.", type: "Long Answer" }
  ],
  "english": [
    { text: "Identify the part of speech of the word 'quickly'.", type: "MCQ", options: ["A. Noun", "B. Adjective", "C. Verb", "D. Adverb"] },
    { text: "Which of the following is a synonym for 'benevolent'?", type: "MCQ", options: ["A. Hostile", "B. Generous", "C. Lazy", "D. Quiet"] },
    { text: "True or False: A metaphor directly compares two things using 'like' or 'as'.", type: "True/False", options: ["True", "False"] },
    { text: "True or False: Active voice usually makes sentences clearer and more direct.", type: "True/False", options: ["True", "False"] },
    { text: "Explain the difference between a metaphor and a simile. Provide one example for each.", type: "Short Answer" },
    { text: "Explain the theme of alienation in modern literature.", type: "Short Answer" },
    { text: "Analyze the use of symbolism in a literary piece of your choice, explaining how it supports the work's primary themes.", type: "Long Answer" }
  ]
};

function generateLocalMockPaper(assignment: any): any {
  const numQuestions = assignment.numberOfQuestions || 5;
  const totalMarks = assignment.totalMarks || 50;
  const questionTypes = assignment.questionTypes && assignment.questionTypes.length > 0 
    ? assignment.questionTypes.map((t: string) => t.trim()) 
    : ["MCQ", "Short Answer"];
  
  const subject = (assignment.subject || "other").toLowerCase().trim();
  
  let sourceQuestions = LOCAL_QUESTION_BANK[subject] || [];
  if (sourceQuestions.length === 0) {
    // Dynamically build a rich set of fallback questions for custom/other subjects
    const subLabel = assignment.subject || "this topic";
    sourceQuestions = [
      { text: `What is a primary element or foundation of ${subLabel}?`, type: "MCQ", options: [`A. Core theory of ${subLabel}`, "B. Irrelevant alternative B", "C. General theory C", "D. None of the above"] },
      { text: `Which of the following is considered a major breakthrough in ${subLabel}?`, type: "MCQ", options: ["A. Ancient methods", `B. Classical ${subLabel} methodology`, "C. Industrial techniques", "D. Modern digital systems"] },
      { text: `True or False: Modern applications of ${subLabel} have significantly altered standard practices.`, type: "True/False", options: ["True", "False"] },
      { text: `True or False: ${subLabel} study is purely theoretical and has no practical applications.`, type: "True/False", options: ["True", "False"] },
      { text: `Briefly outline the primary objectives and scope of studying ${subLabel}.`, type: "Short Answer" },
      { text: `Describe one major challenge faced by professionals working in ${subLabel} today.`, type: "Short Answer" },
      { text: `Provide a comprehensive analysis of the evolution of ${subLabel}. Discuss key milestones and their future societal impacts.`, type: "Long Answer" }
    ];
  }

  // Filter questions based on requested types
  let filteredQuestions = sourceQuestions.filter(q => questionTypes.includes(q.type));
  if (filteredQuestions.length === 0) {
    filteredQuestions = sourceQuestions; // fallback if no types match
  }

  const selectedQuestions: any[] = [];
  const marksPerQuestion = Math.max(1, Math.floor(totalMarks / numQuestions));
  const remainingMarks = totalMarks - (marksPerQuestion * numQuestions);

  for (let i = 0; i < numQuestions; i++) {
    let baseQuestion = filteredQuestions[i % filteredQuestions.length];
    
    // If we have to reuse questions, customize the text to make it unique
    let text = baseQuestion.text;
    if (i >= filteredQuestions.length) {
      const copyNum = Math.floor(i / filteredQuestions.length) + 1;
      text = text.replace("?", ` (Part ${copyNum})?`);
      if (!text.endsWith("?")) {
        text += ` (Part ${copyNum})`;
      }
    }

    const qMarks = i === numQuestions - 1 ? (marksPerQuestion + remainingMarks) : marksPerQuestion;

    selectedQuestions.push({
      number: i + 1,
      text,
      type: baseQuestion.type,
      difficulty: assignment.difficulty || "medium",
      marks: qMarks,
      options: baseQuestion.options ? [...baseQuestion.options] : undefined
    });
  }

  // Separate into Section A (Objective) and Section B (Subjective)
  // Section A contains MCQ & True/False. Section B contains Short & Long Answers.
  const sectionAQuestions = selectedQuestions.filter(q => q.type === "MCQ" || q.type === "True/False");
  const sectionBQuestions = selectedQuestions.filter(q => q.type !== "MCQ" && q.type !== "True/False");

  const sections: any[] = [];

  if (sectionAQuestions.length > 0) {
    // Re-number questions in Section A sequentially
    sections.push({
      title: "Section A (Objective Type Questions)",
      instruction: "Attempt all questions. Choose the correct option or write True/False.",
      questions: sectionAQuestions
    });
  }

  if (sectionBQuestions.length > 0) {
    sections.push({
      title: "Section B (Subjective Type Questions)",
      instruction: "Provide clear, concise answers for the short questions, and detailed explanations for the long questions.",
      questions: sectionBQuestions
    });
  }

  // Re-number all questions sequentially across sections to ensure chronological index
  let qNum = 1;
  for (const s of sections) {
    for (const q of s.questions) {
      q.number = qNum++;
    }
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

