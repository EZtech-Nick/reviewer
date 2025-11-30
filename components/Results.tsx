import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ExamResult, Subject } from '../types';

export const Results: React.FC = () => {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    loadInitData();
  }, []);

  const loadInitData = async () => {
    setLoading(true);
    const sRes = await api.getSubjects();
    if (sRes.data) setSubjects(sRes.data);
    
    await loadResults();
    setLoading(false);
  };

  const loadResults = async (subject?: string) => {
    setLoading(true);
    const res = await api.getResults(subject);
    if (res.status === 'success' && res.data) {
      setResults(res.data);
    } else {
        setResults([]);
    }
    setLoading(false);
  };

  const handleFilterChange = (sub: string) => {
      setSubjectFilter(sub);
      loadResults(sub || undefined);
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-bold text-gray-800">Exam Results</h2>
            <select 
                className="border p-2 rounded w-64"
                value={subjectFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
            >
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
        </div>

        {loading ? (
             <div className="text-center py-12">Loading results...</div>
        ) : results.length === 0 ? (
             <div className="text-center py-12 text-gray-500">No results found.</div>
        ) : (
             <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                 <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50">
                         <tr>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                             <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                         </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                         {results.map((r) => (
                             <tr key={r.id}>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                     {new Date(r.timestamp).toLocaleDateString()} {new Date(r.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                     {r.studentName}
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                     <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-teal-100 text-teal-800">
                                         {r.subject}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                     {r.status === 'pending' ? (
                                         <span className="text-orange-500 font-medium text-xs">Pending Grading</span>
                                     ) : (
                                         <span className="text-green-600 font-medium text-xs">Final</span>
                                     )}
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                                     {r.score} / {r.totalPoints}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
                 <div className="bg-gray-50 px-6 py-3 text-xs text-gray-400 text-right">
                     * Only the latest 5 submissions per subject are retained.
                 </div>
             </div>
        )}
    </div>
  );
};
