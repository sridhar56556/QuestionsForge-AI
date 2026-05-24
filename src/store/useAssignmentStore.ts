import { create } from 'zustand';
import { AssignmentFormData, QuestionPaperType } from '../types';

interface AssignmentStore {
  currentAssignmentId: string | null;
  status: "idle" | "pending" | "processing" | "completed" | "failed";
  questionPaper: QuestionPaperType | null;
  formData: Partial<AssignmentFormData>;
  setAssignmentId: (id: string | null) => void;
  setStatus: (status: "idle" | "pending" | "processing" | "completed" | "failed") => void;
  setPaper: (paper: QuestionPaperType | null) => void;
  updateFormData: (data: Partial<AssignmentFormData>) => void;
  reset: () => void;
}

export const useAssignmentStore = create<AssignmentStore>((set) => ({
  currentAssignmentId: null,
  status: "idle",
  questionPaper: null,
  formData: {},
  setAssignmentId: (id) => set({ currentAssignmentId: id }),
  setStatus: (status) => set({ status }),
  setPaper: (paper) => set({ questionPaper: paper }),
  updateFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  reset: () => set({ currentAssignmentId: null, status: "idle", questionPaper: null, formData: {} })
}));
