import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAssignmentStore } from '../../store/useAssignmentStore';

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  hard: 'bg-red-100 text-red-700 border-red-200'
};

export default function QuestionPaperView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { status, questionPaper, setAssignmentId, formData } = useAssignmentStore();

  useEffect(() => {
    if (id) {
      setAssignmentId(id);
    }
  }, [id, setAssignmentId]);

  if (status === 'pending' || status === 'processing' || !questionPaper) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mb-4"></div>
        <p className="text-lg">Generating Assessment with AI...</p>
        <p className="text-sm mt-2">This may take a few seconds as the model processes.</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-red-500">
        <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xl font-semibold">Generation Failed</p>
        <button onClick={() => navigate('/create')} className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-lg">Try Again</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Generated Assessment</h1>
        <div className="flex gap-4">
          <a
            href={`/api/papers/${id}/pdf`}
            download
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition"
          >
            Download PDF
          </a>
          <button 
            onClick={() => navigate('/create')}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg shadow-sm hover:bg-slate-50"
          >
             Create New
          </button>
        </div>
      </div>

      <div className="bg-white shadow-xl shadow-slate-200/50 rounded-xl border border-slate-200 overflow-hidden">
        {/* Header Block */}
        <div className="p-8 border-b-2 border-slate-800 text-center bg-slate-50">
          <h2 className="text-3xl font-bold uppercase tracking-widest text-slate-900 mb-4">
            {formData.title || 'Assessment Examination'}
          </h2>
          <div className="flex justify-between max-w-xl mx-auto text-sm font-semibold text-slate-600 uppercase">
            <span>Subject: {formData.subject || 'N/A'}</span>
            <span>Grade: {formData.grade || 'N/A'}</span>
            <span>Marks: {questionPaper.totalMarks}</span>
            <span>Time: 2 Hours</span>
          </div>
        </div>
        
        {/* Student Info Block */}
        <div className="px-8 flex flex-col pt-8 pb-6 border-b border-slate-200 bg-white">
          <div className="flex flex-col gap-4 max-w-2xl text-slate-700 font-mono text-sm leading-8">
            <p className="flex w-full items-baseline">
               <span>Name:</span> 
               <span className="flex-1 ml-4 border-b-2 border-dotted border-slate-400"></span>
            </p>
            <p className="flex gap-12 items-baseline">
               <span className="flex items-baseline w-1/2">Roll No: <span className="flex-1 ml-4 border-b-2 border-dotted border-slate-400"></span></span>
               <span className="flex items-baseline w-1/2">Section: <span className="flex-1 ml-4 border-b-2 border-dotted border-slate-400"></span></span>
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="p-8 space-y-12 bg-white">
          {questionPaper.sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-6">
              <div className="mb-8 border-l-4 border-slate-800 pl-4">
                <h3 className="text-xl font-bold text-slate-900">{section.title}</h3>
                <p className="text-slate-500 italic mt-1 text-sm">{section.instruction}</p>
              </div>

              <div className="space-y-10">
                {section.questions.map((q, qIdx) => (
                  <div key={qIdx} className="relative pl-8">
                    <div className="absolute left-0 top-0 text-slate-900 font-bold">
                       {q.number}.
                    </div>
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-slate-900 text-[1.05rem] leading-relaxed font-medium">
                          {q.text}
                        </p>
                        <div className="flex flex-col items-end shrink-0 gap-2 mt-1">
                           <span className="text-sm font-semibold text-slate-500">[{q.marks} marks]</span>
                           <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${difficultyColors[q.difficulty?.toLowerCase()] || difficultyColors.medium}`}>
                             {q.difficulty}
                           </span>
                        </div>
                      </div>

                      {q.options && q.options.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 pl-2">
                           {q.options.map((opt, oIdx) => (
                             <div key={oIdx} className="flex gap-2 text-slate-700">
                                <span className="w-full p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                                  {opt}
                                </span>
                             </div>
                           ))}
                        </div>
                      )}
                      
                      {(!q.options || q.options.length === 0) && (
                         <div className="mt-8 mb-4 border-b border-dotted border-slate-300 pb-16"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
