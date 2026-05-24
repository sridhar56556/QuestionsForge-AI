import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAssignmentStore } from '../store/useAssignmentStore';

const socket = io(window.location.origin);

export function useSocket() {
  const { currentAssignmentId, setStatus, setPaper, updateFormData } = useAssignmentStore();

  useEffect(() => {
    if (!currentAssignmentId) return;

    let active = true;
    let pollInterval: any = null;

    const fetchPaperAndComplete = async () => {
      try {
        const res = await fetch(`/api/papers/${currentAssignmentId}`);
        if (res.ok && active) {
          const paper = await res.json();
          setPaper(paper);
          setStatus("completed");
          if (pollInterval) clearInterval(pollInterval);
        }
      } catch (e) {
        console.error("Failed to fetch paper:", e);
      }
    };

    const checkCurrentStatus = async () => {
      try {
        const res = await fetch(`/api/assignments/${currentAssignmentId}`);
        if (!res.ok) return;
        const assignment = await res.json();
        if (!active) return;

        // Hydrate form data (title, subject, grade, etc.)
        updateFormData({
          title: assignment.title,
          subject: assignment.subject,
          grade: assignment.grade,
          difficulty: assignment.difficulty,
          dueDate: new Date(assignment.dueDate),
          questionTypes: assignment.questionTypes,
          numberOfQuestions: assignment.numberOfQuestions,
          totalMarks: assignment.totalMarks,
          additionalInstructions: assignment.additionalInstructions
        });

        if (assignment.status === "completed") {
          setStatus("completed");
          await fetchPaperAndComplete();
        } else if (assignment.status === "failed") {
          setStatus("failed");
          if (pollInterval) clearInterval(pollInterval);
        } else {
          setStatus(assignment.status);
        }
      } catch (e) {
        console.error("Failed to check status:", e);
      }
    };

    // Run initial state recovery
    checkCurrentStatus();

    // Setup polling fallback every 3 seconds
    pollInterval = setInterval(checkCurrentStatus, 3000);

    const handleProcessing = ({ assignmentId }: any) => {
      if (assignmentId === currentAssignmentId) {
        setStatus("processing");
      }
    };
    
    const handleCompleted = ({ assignmentId }: any) => {
      if (assignmentId === currentAssignmentId) {
        fetchPaperAndComplete();
      }
    };
    
    const handleFailed = ({ assignmentId }: any) => {
      if (assignmentId === currentAssignmentId) {
        setStatus("failed");
        if (pollInterval) clearInterval(pollInterval);
      }
    };

    socket.on('job:processing', handleProcessing);
    socket.on('job:completed', handleCompleted);
    socket.on('job:failed', handleFailed);

    return () => {
      active = false;
      if (pollInterval) clearInterval(pollInterval);
      socket.off('job:processing', handleProcessing);
      socket.off('job:completed', handleCompleted);
      socket.off('job:failed', handleFailed);
    };
  }, [currentAssignmentId, setStatus, setPaper, updateFormData]);
}

