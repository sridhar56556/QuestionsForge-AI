# VedaAI - System Functionalities & Architecture Documentation

This document provides a comprehensive overview of the VedaAI system, detailing its design, code structure, data models, APIs, and user-facing functionalities.

---

## 1. System Overview & Architecture

VedaAI is an AI-powered educational application that helps instructors automatically generate structured, curriculum-aligned exam question papers from text descriptions or uploaded reference materials (PDFs/TXT files). 

The system is built on a modern full-stack web stack:
- **Frontend**: Vite + React, Tailwind CSS (v4), Framer Motion (`motion/react`), React Hook Form, and Zustand for state management.
- **Backend**: Express.js server, Node.js, and Socket.io.
- **AI Engine**: Google Gemini API (`gemini-3.5-flash` model via the `@google/genai` SDK) is used to perform document analysis and structure question papers.
- **Queue/Worker Pattern**: BullMQ with Redis manages background worker generation jobs, ensuring the main thread is not blocked during multi-second LLM calls.
- **Database/Cache**: MongoDB stores assignment metadata and generated question papers. Redis caches generated outputs.
- **PDF Generation**: Puppeteer runs a headless browser to print high-fidelity, classroom-ready A4 PDF question papers with automatic styling.
- **Graceful Fallbacks**: Dynamic detection switches the app to a zero-config "Preview Mode" (using local mock queues and in-memory Map storage) if MongoDB or Redis is unavailable.

```text
    +----------------------------------+
    |      Frontend (Vite + React)     |
    +-----------------+----------------+
                      |
            REST API  |  WebSockets (Socket.io)
                      v
    +-----------------+----------------+
    |        Backend (Express)         |
    +--------+--------+--------+-------+
             |        |        |
             |        |        +----------------------------------------+
             v        v        v                                        v
     [Gemini AI]  [MongoDB]  [BullMQ / Redis]                        [Puppeteer]
     - Prefill    - Metadata  - Job Queues                           - PDF Export
     - Questions  - Papers    - Task Worker (processJob)
```

---

## 2. Core User Features & Workflows

### 2.1 AI Document Analyzer (Prefill Suggestions)
- **Action**: The user uploads reference material (a PDF or TXT file of up to 10MB) via a drag-and-drop file uploader.
- **Process**:
  1. The backend parses the uploaded document using `pdf-parse` (for PDF files) or standard UTF-8 reading (for text files).
  2. The text (first 12,000 characters) is sent to Gemini 3.5 Flash with a prompt instructing it to suggest a test configuration (e.g. topic, target grade, proposed questions, and instructions).
  3. The response is parsed as structured JSON.
- **Outcome**: The React creation form automatically populates the title, subject, difficulty, recommended question count, total marks, and additional guidelines. The UI also renders a list of *AI-Analyzed Document Insights* showcasing proposed sample questions.

### 2.2 Custom Assessment Builder Form
Users can customize their assessment parameters manually:
- **Title**: Descriptive header (e.g., *"Midterm Physics"*).
- **Subject**: Pre-defined options (Java, Python, Mathematics, Physics, Chemistry, English, etc.) or a custom field under "Other".
- **Grade**: Pre-defined levels (Grades 1-12, College).
- **Due Date**: Date selector.
- **Question Types**: Multiselect buttons for MCQs, Short Answer, Long Answer, and True/False.
- **Volume & Weight**: Precise input fields for **Number of Questions** and **Total Marks**.
- **Difficulty**: Options for *Easy*, *Medium*, *Hard*, or *Mixed*.
- **Instructions**: Rich context field where instructors define custom guidelines (e.g. *"Focus on kinematics"*).

### 2.3 Real-Time Generation Queue & Status Tracker
- **Submission**: When the user clicks "Generate Question Paper", the assessment is saved with a status of `pending`.
- **Worker Execution**: A job is added to the generation queue. The background worker picks up the job, changes its status to `processing`, and calls Gemini 3.5 Flash to synthesize the full paper content.
- **WebSocket Streaming**: Updates are pushed to the client instantly via Socket.io events (`job:processing`, `job:completed`, `job:failed`).
- **Resilient Polling Fallback**: If the WebSocket disconnects, the frontend hook triggers a 3-second long polling check against the backend status endpoint to fetch the state.
- **Completion**: Once finished, status changes to `completed` and the UI navigates to the paper viewer.

### 2.4 Print-Ready Assessment Viewer
Renders the generated question paper in a polished school-examination style:
- **School Header**: Upper banner displaying Title, Subject, Grade, Marks, and Time Limits.
- **Student Sheet**: Blank, dotted fields for Student Name, Roll Number, and Class Section.
- **Sectioned Layout**: Automatically groups questions into sections (e.g., Section A, Section B) with individual section instructions.
- **Question Details**: Displays questions chronologically with inline tags indicating marks and specific difficulty level indicators (color-coded by difficulty).
- **Type-Specific Renders**: 
  - MCQs display options laid out in a grid.
  - Short/Long Answers render dotted lines or empty spacing to write answers.

### 2.5 PDF Export Engine
- Clicking "Download PDF" calls the backend PDF service.
- The service uses Puppeteer to render the question paper as HTML styled with printer-friendly margins, page-break safeguards (avoiding section headers split across pages), and prints the result as an A4 document.
- Returns a downloadable PDF buffer directly to the user's browser.

---

## 3. Code Architecture & Key Modules

### 3.1 Backend Configuration & Infrastructure

#### [db.ts](file:///c:/Users/Dell/OneDrive/Desktop/vedaai%20(1)/backend/src/config/db.ts)
Responsible for establishing a connection to MongoDB with a 2-second timeout threshold. If connection fails, it initiates **Preview Mode** using in-memory fallbacks.

#### [redis.ts](file:///c:/Users/Dell/OneDrive/Desktop/vedaai%20(1)/backend/src/config/redis.ts)
Configures `ioredis`. If connections to Redis fail, it turns off the redisClient dynamically, reverting queuing to in-memory fallbacks.

#### [preview-mock.ts](file:///c:/Users/Dell/OneDrive/Desktop/vedaai%20(1)/backend/src/preview-mock.ts)
Provides standard mock implementations for when databases or caches are unavailable:
- `MockDB`: Simple in-memory maps (`assignments` and `papers`) mimicking MongoDB storage.
- `MockQueue`: An event-driven mock queue that schedules job execution using `setTimeout(..., 1000)` to simulate asynchronous database operations.

---

### 3.2 Data Models (Mongoose Schemas)

#### [Assignment.ts](file:///c:/Users/Dell/OneDrive/Desktop/vedaai%20(1)/backend/src/models/Assignment.ts)
Tracks the configuration of the question paper creation request.
```typescript
interface IAssignment extends Document {
  title: string;
  subject: string;
  grade: string;
  dueDate: Date;
  questionTypes: string[];
  numberOfQuestions: number;
  totalMarks: number;
  difficulty: string;
  additionalInstructions: string;
  fileContent?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}
```

#### [QuestionPaper.ts](file:///c:/Users/Dell/OneDrive/Desktop/vedaai%20(1)/backend/src/models/QuestionPaper.ts)
Tracks the generated sections, questions, marks allocation, options list, and reference ID mapping.
```typescript
interface IQuestionPaper extends Document {
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
```

---

### 3.3 REST API Endpoints

#### `assignments.ts` - Routing Prefix: `/api/assignments`
- `POST /analyze`
  - Parses uploaded PDF/TXT files using `pdf-parse`.
  - Invokes `analyzeReferenceMaterial` inside Claude/Gemini Service.
  - Returns recommended configuration parameters and proposed questions.
- `POST /`
  - Creates a new Assignment entry.
  - Triggers the generation process by adding the metadata configuration to the BullMQ or Mock Queue via `addToGenerationQueue`.
- `GET /:id`
  - Fetches the assignment status (`pending` / `processing` / `completed` / `failed`) and form metadata.

#### `papers.ts` - Routing Prefix: `/api/papers`
- `GET /:assignmentId`
  - Fetches the generated question paper structure. Checks Redis cache first before querying MongoDB or the in-memory MockDB.
- `GET /:assignmentId/pdf`
  - Retrieves the paper and assignment metadata, compiles them into structured print-ready HTML, launches Puppeteer, prints the page to a PDF, and triggers a file attachment download.

---

### 3.4 Services & Background Processing

#### [claudeService.ts](file:///c:/Users/Dell/OneDrive/Desktop/vedaai%20(1)/backend/src/services/claudeService.ts)
Handles interactions with Google Gemini AI Studio API:
- `analyzeReferenceMaterial(text)`: Prompts Gemini 3.5 Flash with a schema to retrieve ideal exam parameters from reference texts.
- `generatePaper(assignment)`: Formulates a systemic educational prompt detailing grade, subject, marks, and constraints. Instructs Gemini to output a strict, valid JSON structure (containing sections, instructions, questions, MCQ options, and marks) and returns it.

#### [pdfService.ts](file:///c:/Users/Dell/OneDrive/Desktop/vedaai%20(1)/backend/src/services/pdfService.ts)
Generates high-fidelity PDF documents:
- Embeds HTML document with student info blocks, clean section break divisions, inline marks notation, and grid options.
- Launches a headless Puppeteer browser, injects the generated markup, sets page constraints (A4 layout, print background colors, page breaks), and returns the PDF buffer.
- Features a plain text fallback buffer if Puppeteer dependencies are unavailable on the host system.

#### [worker.ts](file:///c:/Users/Dell/OneDrive/Desktop/vedaai%20(1)/backend/src/queues/worker.ts)
Handles queue processing:
- Subscribes to the BullMQ queue (or MockQueue).
- On a new job, changes the database assignment status to `processing` and emits a WebSocket notice.
- Invokes `generatePaper` service.
- Saves the resulting paper JSON structure to MongoDB/MockDB, writes it to the Redis cache, updates the assignment status to `completed`, and broadcasts a completion notification over WebSockets.
- Handles job execution failures by setting status to `failed` and broadcasting errors.

---

### 3.5 Frontend Architecture

#### `main.tsx` & `App.tsx`
Configures application routing (`/create` and `/paper/:id`), provides global CSS resets, and wraps the tree in a provider context to manage sockets.

#### [useSocket.ts](file:///c:/Users/Dell/OneDrive/Desktop/vedaai%20(1)/src/hooks/useSocket.ts)
Maintains socket listener hooks for `job:processing`, `job:completed`, and `job:failed`. It triggers state hydration via API fetches and contains a polling mechanism that queries the status fallback API endpoint every 3 seconds.

#### `useAssignmentStore.ts`
Zustand global store holding:
- `currentAssignmentId`
- Job `status` (`idle`, `pending`, `processing`, `completed`, `failed`)
- The `questionPaper` structure
- Prefilled form data.

#### `AssignmentForm` component
A multi-faceted creation interface containing custom state indicators for drag-and-drop interactions, upload processing status bars, and collapsible visual grids showcasing AI-extracted question previews.

#### `QuestionPaper` component
A styling viewport displaying the formatted question sheets, complete with printable student metadata grids, section cards, difficulty badges, and floating PDF download handles.

---

## 4. Environment & Dev Execution
- Ports occupied: `3000` (for Express backend serving APIs and Vite SPA frontend dev middleware).
- Configuration variables:
  - `GEMINI_API_KEY`: Key to run AI analysis and question paper generations.
  - `MONGO_URI` / `MONGODB_URI`: Connection address for MongoDB (falls back to memory if empty).
  - `REDIS_URL`: BullMQ queue connection string (falls back to memory if empty).
