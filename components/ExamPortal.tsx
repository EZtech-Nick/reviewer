import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Question, QuestionType, ExamResult, Subject } from '../types';
import { CheckCircle, Clock, BookOpen, HelpCircle, AlertTriangle } from 'lucide-react';

interface ExamPortalProps {
  onComplete: () => void;
}

export const ExamPortal: React.FC<ExamPortalProps> = ({ onComplete }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [examStarted, setExamStarted] = useState(false);
  
  // Exam State
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{earned: number, total: number} | null>(null);
  
  // Submission UI State
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    setLoading(true);
    const res = await api.getSubjects();
    if (res.status === 'success' && res.data) {
      setSubjects(res.data);
    }
    setLoading(false);
  };

  const startExam = async (subject: string) => {
    if (!studentName.trim()) {
      alert("Please enter your name first.");
      return;
    }
    setLoading(true);
    const res = await api.getQuestions(subject);
    if (res.status === 'success' && res.data && res.data.length > 0) {
      setQuestions(res.data);
      setSelectedSubject(subject);
      setExamStarted(true);
    } else {
      alert("No questions found for this subject or API error.\nPlease check your internet connection or try again.");
    }
    setLoading(false);
  };

  const handleAnswerChange = (qId: string, val: any) => {
    setAnswers(prev => ({...prev, [qId]: val}));
  };

  const calculateScore = () => {
    let earned = 0;
    let total = 0;

    questions.forEach(q => {
        try {
            // Ensure points is a number
            const points = Number(q.points) || 0;
            total += points;
            
            const studentAns = answers[q.id];
            
            if (studentAns === undefined || studentAns === null || studentAns === '') return;

            if (q.type === QuestionType.TRUE_FALSE || q.type === QuestionType.MULTIPLE_CHOICE) {
                if (String(studentAns) === String(q.correctAnswer)) earned += points;
            } else if (q.type === QuestionType.IDENTIFICATION) {
                if (String(studentAns).toLowerCase().trim() === String(q.correctAnswer || '').toLowerCase().trim()) {
                    earned += points;
                }
            } else if (q.type === QuestionType.MATCHING) {
                let pairsCorrect = 0;
                const totalPairs = q.matchingPairs?.length || 0;
                q.matchingPairs?.forEach(pair => {
                    if (studentAns[pair.left] === pair.right) pairsCorrect++;
                });
                if (totalPairs > 0) {
                    earned += (points * (pairsCorrect / totalPairs));
                }
            } else if (q.type === QuestionType.ENUMERATION) {
                 let correctList: string[] = [];
                 
                 // Safer correct answer parsing
                 if (Array.isArray(q.correctAnswer)) {
                     correctList = q.correctAnswer.map(s => String(s || '').trim().toLowerCase());
                 } else if (typeof q.correctAnswer === 'string') {
                     correctList = q.correctAnswer.split(',').map(s => s.trim().toLowerCase());
                 } else {
                     correctList = [];
                 }
                 
                 let studentList: string[] = [];
                 if (Array.isArray(studentAns)) {
                     studentList = studentAns.map(s => String(s || '').trim().toLowerCase()).filter(s => s);
                 } else {
                     studentList = String(studentAns).split(/[,\n]/).map(s => s.trim().toLowerCase()).filter(s => s);
                 }
                 
                 let validCount = 0;
                 const tempCorrect = [...correctList];
                 
                 studentList.forEach(sa => {
                     const foundIdx = tempCorrect.indexOf(sa);
                     if (foundIdx !== -1) {
                         validCount++;
                         tempCorrect.splice(foundIdx, 1); 
                     }
                 });
                 
                 // Avoid division by zero
                 if (correctList.length > 0) {
                    const valPerItem = points / correctList.length;
                    earned += (validCount * valPerItem);
                 }
            }
        } catch (err) {
            console.error(`Error scoring question ${q.id}:`, err);
        }
    });

    return { earned: Math.round(earned), total };
  };

  const handleSubmitClick = () => {
      if (!isConfirming) {
          setIsConfirming(true);
          // Auto-reset confirmation after 5 seconds if not clicked
          setTimeout(() => setIsConfirming(false), 5000);
          return;
      }
      submitExam();
  };

  const submitExam = async () => {
    console.log("Submitting exam...");
    setLoading(true);
    
    try {
        // Wrap score calculation in try-catch to prevent crash
        let resultScore;
        try {
            resultScore = calculateScore();
            setScore(resultScore);
        } catch (scoreErr) {
            console.error("Scoring Error:", scoreErr);
            alert("Error calculating score. Please contact admin.");
            setLoading(false);
            return;
        }
        
        const hasEssay = questions.some(q => q.type === QuestionType.ESSAY);

        const examResult: ExamResult = {
            id: Date.now().toString(),
            studentName,
            subject: selectedSubject!,
            score: resultScore.earned,
            totalPoints: resultScore.total,
            timestamp: new Date().toISOString(),
            answers: answers,
            status: hasEssay ? 'pending' : 'graded'
        };

        const res = await api.submitExam(examResult);
        
        if (res.status === 'success') {
            console.log("Submission success");
            setSubmitted(true);
        } else {
            console.error("Submit Exam Failed:", res);
            setIsConfirming(false); // Reset button
            alert(`Submission Failed!\n\nReason: ${res.message || 'Unknown server error'}.\n\nPlease try clicking Submit again.`);
        }
    } catch (error) {
        console.error("Submit Error:", error);
        setIsConfirming(false); // Reset button
        alert("Network Error: Could not connect to the server.\n\n1. Check your internet.\n2. Ensure your Google Script is deployed as 'Anyone'.\n3. Try again.");
    } finally {
        setLoading(false);
    }
  };

  if (!examStarted) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center border-t-4 border-teal-500">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome to the Examination Portal</h1>
            <p className="text-gray-600 mb-8">Please enter your name and select a subject to begin.</p>
            
            <input 
                type="text" 
                placeholder="Enter Student Full Name" 
                className="w-full max-w-md mx-auto block p-4 border-2 border-gray-200 rounded-lg text-lg text-center focus:border-teal-500 focus:outline-none mb-8"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
            />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {loading ? (
                <div className="col-span-3 text-center py-10 flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-2"></div>
                    <p className="text-gray-500">Loading subjects...</p>
                </div>
            ) : subjects.length === 0 ? (
                <div className="col-span-3 text-center py-10 text-gray-400">
                    No subjects available.
                </div>
            ) : (
                subjects.map(sub => (
                <div key={sub.name} className="bg-white hover:shadow-lg transition-all transform hover:-translate-y-1 rounded-xl overflow-hidden cursor-pointer border flex flex-col" onClick={() => startExam(sub.name)}>
                    <div className="h-24 bg-teal-600 flex items-center justify-center relative overflow-hidden">
                        <BookOpen className="text-teal-400 absolute opacity-20 transform scale-150 -rotate-12" size={80} />
                        <span className="text-3xl text-white font-bold relative z-10">{sub.name[0]}</span>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                           <h3 className="font-bold text-xl text-gray-800 mb-2">{sub.name}</h3>
                           <div className="flex items-center text-sm text-gray-500 gap-1">
                              <HelpCircle size={14} />
                              <span>{sub.questionCount} Questions</span>
                           </div>
                        </div>
                        <button className="mt-4 w-full py-2 bg-gray-50 text-teal-600 font-semibold rounded hover:bg-teal-50 transition">
                           Take Exam
                        </button>
                    </div>
                </div>
            )))}
        </div>
      </div>
    );
  }

  if (submitted && score) {
      return (
          <div className="max-w-2xl mx-auto bg-white p-10 rounded-lg shadow-lg text-center animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="text-green-600 w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Exam Submitted!</h2>
              <p className="text-gray-500 mb-8">Thank you, {studentName}. Your answers have been recorded.</p>
              
              <div className="bg-gray-50 p-6 rounded-lg mb-8">
                  <span className="block text-sm text-gray-500 uppercase tracking-wide">Your Score</span>
                  <div className="text-5xl font-bold text-teal-600 mt-2">
                      {score.earned} <span className="text-2xl text-gray-400">/ {score.total}</span>
                  </div>
                  {questions.some(q => q.type === QuestionType.ESSAY) && (
                      <p className="text-sm text-orange-500 mt-2 font-medium">
                          * Score is provisional. Essay questions require manual grading.
                      </p>
                  )}
              </div>

              <button onClick={() => window.location.reload()} className="bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-700">
                  Return to Home
              </button>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto">
         <div className="bg-white p-4 rounded-lg shadow-sm border-b mb-6 sticky top-20 z-10 flex justify-between items-center">
             <div>
                 <h2 className="font-bold text-lg text-gray-800">{selectedSubject} Exam</h2>
                 <p className="text-sm text-gray-500">Student: {studentName}</p>
             </div>
             <div className="flex items-center gap-2 text-teal-600 font-medium">
                 <Clock size={18} />
                 <span>In Progress</span>
             </div>
         </div>

         <div className="space-y-8 pb-32">
             {questions.map((q, idx) => (
                 <div key={q.id} className="bg-white p-6 rounded-lg shadow-sm border">
                     <div className="flex justify-between mb-4">
                         <span className="font-bold text-lg text-gray-700">Question {idx + 1}</span>
                         <span className="text-sm text-gray-400 font-mono">({q.points} pts)</span>
                     </div>
                     
                     {q.imageUrl && (
                         <img src={q.imageUrl} alt="Question" className="max-h-64 rounded mb-4 object-contain" />
                     )}

                     <p className="text-lg mb-6 text-gray-800 whitespace-pre-wrap">{q.questionText}</p>

                     {/* Render Input based on type */}
                     {q.type === QuestionType.TRUE_FALSE && (
                         <div className="space-y-2">
                             {['TRUE', 'FALSE'].map(opt => (
                                 <label key={opt} className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                                     <input 
                                        type="radio" 
                                        name={q.id} 
                                        value={opt}
                                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                        className="w-5 h-5 text-teal-600 focus:ring-teal-500"
                                     />
                                     <span className="capitalize">{opt.toLowerCase()}</span>
                                 </label>
                             ))}
                         </div>
                     )}

                     {q.type === QuestionType.MULTIPLE_CHOICE && (
                         <div className="space-y-2">
                             {q.options?.map((opt, i) => (
                                 <label key={i} className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                                     <input 
                                        type="radio" 
                                        name={q.id} 
                                        value={opt}
                                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                        className="w-5 h-5 text-teal-600 focus:ring-teal-500"
                                     />
                                     <span>{opt}</span>
                                 </label>
                             ))}
                         </div>
                     )}

                     {q.type === QuestionType.IDENTIFICATION && (
                         <input 
                            type="text" 
                            className="w-full p-3 border rounded focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            placeholder="Type your answer here..."
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                         />
                     )}

                     {q.type === QuestionType.ENUMERATION && (
                         <div className="space-y-2">
                             {Array.isArray(q.correctAnswer) ? (
                                 // Render N inputs based on correct answer length
                                 q.correctAnswer.map((_, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-gray-400 w-6 text-right font-mono">{i+1}.</span>
                                        <input 
                                            type="text" 
                                            className="w-full p-3 border rounded focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                            placeholder={`Item ${i+1}`}
                                            onChange={(e) => {
                                                const currentArr = (answers[q.id] as string[]) || [];
                                                const newArr = [...currentArr];
                                                newArr[i] = e.target.value;
                                                handleAnswerChange(q.id, newArr);
                                            }}
                                        />
                                    </div>
                                 ))
                             ) : (
                                 // Fallback for legacy string-based enumeration
                                 <textarea 
                                    className="w-full p-3 border rounded focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                    rows={3}
                                    placeholder="List your answers separated by commas..."
                                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                 />
                             )}
                         </div>
                     )}

                     {q.type === QuestionType.ESSAY && (
                         <textarea 
                            className="w-full p-3 border rounded focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            rows={4}
                            placeholder="Type your essay here..."
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                         />
                     )}

                     {q.type === QuestionType.MATCHING && (
                         <div className="grid grid-cols-1 gap-4">
                             {q.matchingPairs?.map((pair, pIdx) => (
                                 <div key={pIdx} className="flex items-center gap-4 flex-col sm:flex-row">
                                     <div className="flex-1 p-3 bg-gray-50 rounded border">{pair.left}</div>
                                     <span className="hidden sm:inline text-gray-400">&rarr;</span>
                                     <select 
                                        className="flex-1 p-3 border rounded focus:ring-2 focus:ring-teal-500"
                                        onChange={(e) => {
                                            const currentAns = answers[q.id] || {};
                                            handleAnswerChange(q.id, {...currentAns, [pair.left]: e.target.value});
                                        }}
                                     >
                                         <option value="">Select match...</option>
                                         {/* Mix up options? For now just list all rights */}
                                         {q.matchingPairs?.map(mp => (
                                             <option key={mp.right} value={mp.right}>{mp.right}</option>
                                         ))}
                                     </select>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>
             ))}

             <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-center z-50">
                 <button 
                    onClick={handleSubmitClick}
                    disabled={loading}
                    className={`
                        font-bold text-xl px-12 py-3 rounded-full shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2
                        ${isConfirming ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'}
                    `}
                 >
                     {loading ? (
                         <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Submitting...
                         </>
                     ) : isConfirming ? (
                         <>
                            <AlertTriangle size={24} />
                            Click again to Confirm
                         </>
                     ) : (
                         'Submit Exam'
                     )}
                 </button>
             </div>
         </div>
    </div>
  );
};