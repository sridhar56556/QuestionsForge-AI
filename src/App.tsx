import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AssignmentForm from './components/AssignmentForm';
import QuestionPaperView from './components/QuestionPaper/index';
import { useSocket } from './hooks/useSocket';

function Providers({ children }: { children: React.ReactNode }) {
  useSocket(); // maintain global socket connection
  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <Providers>
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
          <header className="bg-white border-b border-slate-200 py-4 px-6 md:px-12 flex items-center justify-between shadow-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-serif font-bold text-xl">V</div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 tracking-tight">VedaAI</h1>
            </div>
            <div className="text-sm font-medium text-slate-500 hidden sm:block">
               AI Assessment Creator
            </div>
          </header>

          <main className="container mx-auto py-8 md:py-12">
            <Routes>
              <Route path="/" element={<Navigate to="/create" replace />} />
              <Route path="/create" element={<AssignmentForm />} />
              <Route path="/paper/:id" element={<QuestionPaperView />} />
            </Routes>
          </main>
        </div>
      </Providers>
    </Router>
  );
}
