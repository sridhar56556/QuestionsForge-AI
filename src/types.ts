export interface AssignmentFormData {
  title: string;
  subject: string;
  grade: string;
  dueDate: Date;
  questionTypes: string[];
  numberOfQuestions: number;
  totalMarks: number;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  additionalInstructions: string;
  file?: File;
}

export interface QuestionPaperType {
  _id: string;
  assignmentId: string;
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
  generatedAt: string;
}
