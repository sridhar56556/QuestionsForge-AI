import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useAssignmentStore } from '../../store/useAssignmentStore';
import { motion, AnimatePresence } from 'motion/react';

const QUESTION_TYPES = ["MCQ", "Short Answer", "Long Answer", "True/False"];
const DIFFICULTIES = ["easy", "medium", "hard", "mixed"];
const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "College"];
const SUBJECTS = [
  "Java",
  "Python",
  "JavaScript",
  "TypeScript",
  "C++",
  "HTML & CSS",
  "SQL & Databases",
  "Data Structures & Algorithms",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "English",
  "Other"
];

export default function AssignmentForm() {
  const navigate = useNavigate();
  const { setAssignmentId, setStatus, updateFormData } = useAssignmentStore();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<any | null>(null);
  const [errorPayload, setErrorPayload] = useState<string | null>(null);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      title: "",
      subjectType: "",
      customSubject: "",
      subject: "",
      grade: "",
      dueDate: "",
      questionTypes: [] as string[],
      numberOfQuestions: 10,
      totalMarks: 50,
      difficulty: "medium",
      additionalInstructions: ""
    }
  });

  const watchSubjectType = watch("subjectType");

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsAnalyzing(true);
    setSuggestions(null);
    setErrorPayload(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch('/api/assignments/analyze', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        let errorMsg = 'Analysis failed';
        try {
          const errData = await res.json();
          if (errData && errData.error) errorMsg = errData.error;
        } catch (_) {}
        throw new Error(errorMsg);
      }
      const data = await res.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions);
        const sugg = data.suggestions;
        if (sugg.title) setValue("title", sugg.title);
        
        if (sugg.subjectType) {
          const matched = SUBJECTS.includes(sugg.subjectType) ? sugg.subjectType : "Other";
          setValue("subjectType", matched);
          if (matched === "Other" && sugg.customSubject) {
            setValue("customSubject", sugg.customSubject);
          }
        }
        if (sugg.grade) {
          setValue("grade", sugg.grade);
        }
        if (sugg.difficulty) {
          setValue("difficulty", sugg.difficulty);
        }
        if (sugg.numberOfQuestions) {
          setValue("numberOfQuestions", sugg.numberOfQuestions);
        }
        if (sugg.totalMarks) {
          setValue("totalMarks", sugg.totalMarks);
        }
        if (sugg.additionalInstructions) {
          setValue("additionalInstructions", sugg.additionalInstructions);
        }
        // Auto-select question types based on suggestions if present, or set general default ones if blank
        setValue("questionTypes", ["MCQ", "Short Answer"]);
      }
    } catch (err: any) {
      console.error("PDF analysis error:", err);
      // Fail gracefully
    } finally {
      setIsAnalyzing(false);
    }
  };


  const onSubmit = async (data: any) => {
    const finalSubject = data.subjectType === "Other" ? data.customSubject : data.subjectType;
    if (!finalSubject || !finalSubject.trim()) {
      alert("Please select or enter a subject");
      return;
    }

    if (data.questionTypes.length === 0) {
      alert("Please select at least one question type");
      return;
    }
    
    setIsSubmitting(true);
    setErrorPayload(null);
    try {
      const formData = new FormData();
      const resolvedData = {
        ...data,
        subject: finalSubject
      };
      
      Object.keys(resolvedData).forEach(key => {
        if (key === 'subjectType' || key === 'customSubject') {
          return;
        }
        if (key === 'questionTypes') {
          formData.append(key, resolvedData[key].join(','));
        } else {
          formData.append(key, resolvedData[key]);
        }
      });
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch('/api/assignments', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMsg = 'Failed to submit';
        try {
          const result = await response.json();
          if (result && result.error) errorMsg = result.error;
        } catch (_) {
          // If response is HTML (e.g., 502/504 Bad Gateway from proxy, or Node error page)
          errorMsg = `Server error (${response.status}): ${response.statusText || 'Unable to connect to service. Please verify that your backend container (Web Service) is running.'}`;
        }
        throw new Error(errorMsg);
      }

      const { assignmentId } = await response.json();
      setAssignmentId(assignmentId);
      setStatus("pending");
      updateFormData(resolvedData);
      navigate(`/paper/${assignmentId}`);
    } catch (error: any) {
      console.error(error);
      setErrorPayload(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Create New Assessment</h2>
      {errorPayload && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">{errorPayload}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input {...register("title", { required: true })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Midterm Physics" />
            {errors.title && <span className="text-xs text-red-500">Title is required</span>}
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject <span className="text-red-500">*</span></label>
              <select
                {...register("subjectType", { required: true })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white focus:outline-none"
              >
                <option value="">Select Subject</option>
                {SUBJECTS.map(subj => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
              {errors.subjectType && <span className="text-xs text-red-500 block mt-1">Subject is required</span>}
            </div>
            
            <AnimatePresence>
              {watchSubjectType === "Other" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <label className="block text-sm font-medium text-slate-700 mb-1">Custom Subject Name <span className="text-red-500">*</span></label>
                  <input
                    {...register("customSubject", { required: watchSubjectType === "Other" })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Cloud Computing"
                  />
                  {errors.customSubject && <span className="text-xs text-red-500 block mt-1">Custom subject name is required</span>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Grade/Class <span className="text-red-500">*</span></label>
            <select {...register("grade", { required: true })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Select Grade</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date <span className="text-red-500">*</span></label>
            <input type="date" {...register("dueDate", { required: true })} min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
           <label className="block text-sm font-medium text-slate-700 mb-2">Question Types <span className="text-red-500">*</span></label>
           <div className="flex flex-wrap gap-2">
             <Controller
               name="questionTypes"
               control={control}
               render={({ field }) => (
                 <>
                   {QUESTION_TYPES.map(type => (
                     <button
                       key={type}
                       type="button"
                       onClick={() => {
                         const updated = field.value.includes(type) ? field.value.filter((t: string) => t !== type) : [...field.value, type];
                         field.onChange(updated);
                       }}
                       className={`px-3 py-1.5 rounded-full text-sm transition-colors border ${field.value.includes(type) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                     >
                       {type}
                     </button>
                   ))}
                 </>
               )}
             />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Questions <span className="text-red-500">*</span></label>
            <input type="number" {...register("numberOfQuestions", { required: true, min: 1, max: 100 })} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Total Marks <span className="text-red-500">*</span></label>
            <input type="number" {...register("totalMarks", { required: true, min: 1 })} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
            <select {...register("difficulty", { required: true })} className="w-full px-3 py-2 border rounded-lg bg-white">
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Additional Instructions</label>
          <textarea {...register("additionalInstructions")} className="w-full px-3 py-2 border rounded-lg min-h-[100px] resize-y" placeholder="Any specific requirements..."></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reference Material (PDF/txt)</label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileChange(f);
            }}
            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-blue-500 transition-colors"
          >
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                 <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-slate-600 justify-center">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 pr-1">
                  <span>Upload a file</span>
                  <input type="file" className="sr-only" accept=".pdf,.txt" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFileChange(f);
                  }} />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-slate-500">PDF, TXT up to 10MB</p>
            </div>
          </div>
          {file && (
            <div className="items-center mt-3 text-sm px-4 py-2 bg-slate-50 rounded-lg flex justify-between">
               <span className="font-medium text-slate-700">📄 {file.name}</span>
               <button type="button" onClick={() => { setFile(null); setSuggestions(null); }} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-3 overflow-hidden"
            >
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-blue-800">Analyzing document with Gemini to recommend ideal questions & subjects...</span>
            </motion.div>
          )}

          {suggestions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-5 bg-violet-50/70 border border-violet-100 rounded-xl space-y-4 shadow-sm mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    <h4 className="font-semibold text-violet-950 text-sm md:text-base">AI Analyzed Document Insights</h4>
                  </div>
                  <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded font-semibold tracking-wider uppercase">Auto-Applied</span>
                </div>
                
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                  We have parsed your PDF and successfully prefilled the form with our recommendations. Below are concrete questions suggested directly from the text:
                </p>

                {suggestions.proposedQuestions && suggestions.proposedQuestions.length > 0 && (
                  <div className="space-y-3 bg-white border border-violet-100 p-4 rounded-lg shadow-sm">
                    <p className="text-xs font-bold text-violet-800 uppercase tracking-widest font-mono">Proposed Sample Questions</p>
                    <div className="divide-y divide-slate-100">
                      {suggestions.proposedQuestions.map((q: any, i: number) => (
                        <div key={i} className="py-2.5 first:pt-0 last:pb-0 text-xs md:text-sm animate-fade-in">
                          <div className="flex justify-between font-medium text-slate-850 mb-1">
                            <span className="leading-relaxed">Q{i + 1}. {q.text}</span>
                            <span className="text-violet-600 shrink-0 font-mono pl-3">[{q.marks}M]</span>
                          </div>
                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-2 pl-3">
                              {q.options.map((opt: string, idx: number) => (
                                <div key={idx} className="text-xs text-slate-500 bg-slate-50/50 border border-slate-100/60 px-2.5 py-1 rounded">
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-2">
          <button type="submit" disabled={isSubmitting || isAnalyzing} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400">
            {isSubmitting ? "Generating AI Assessment (this takes 10-15s)..." : "Generate Question Paper"}
          </button>
          <AnimatePresence>
            {isSubmitting && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-xs text-slate-500 font-medium">
                Please wait, Gemini is actively generating questions...
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
