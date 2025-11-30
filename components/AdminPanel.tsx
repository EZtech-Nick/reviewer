import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Question, QuestionType, Subject } from '../types';
import { Plus, Trash2, Edit2, Save, X, ImageIcon, Code, Copy, Check, Table, Settings, ExternalLink, RefreshCw } from 'lucide-react';

const GAS_CODE = `/*
 * EZTechNick Reviewer Backend
 * Google Apps Script
 */

// ==========================================
// CONFIGURATION
// ==========================================
const ADMIN_PASSWORD = 'admin123'; // <--- CHANGE THIS PASSWORD
// ==========================================

function doPost(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.TEXT);
  
  try {
    var requestBody = e.postData.contents;
    var payload;
    try {
        payload = JSON.parse(requestBody);
    } catch (parseError) {
        return output.setContent(JSON.stringify({ status: 'error', message: 'Invalid JSON payload' }));
    }
    
    var action = payload.action;
    var result = {};
    
    if (action === 'checkAdmin') {
      result = checkAdmin(payload.password);
    } else if (action === 'getSubjects') {
      result = getSubjects();
    } else if (action === 'getQuestions') {
      result = getQuestions(payload.subject);
    } else if (action === 'saveQuestion') {
      result = saveQuestion(payload.question);
    } else if (action === 'deleteQuestion') {
      result = deleteQuestion(payload.id, payload.subject);
    } else if (action === 'submitExam') {
      result = submitExam(payload.result);
    } else if (action === 'getResults') {
      result = getResults(payload.subject);
    } else if (action === 'addSubject') {
      result = addSubject(payload.subject);
    } else if (action === 'deleteSubject') {
      result = deleteSubject(payload.subject);
    } else {
      result = { status: 'error', message: 'Invalid action: ' + action };
    }
    
    output.setContent(JSON.stringify(result));
  } catch(err) {
    output.setContent(JSON.stringify({ status: 'error', message: err.toString() }));
  }
  
  return output;
}

function checkAdmin(password) {
  if (password === ADMIN_PASSWORD) {
    return { status: 'success' };
  } else {
    return { status: 'error', message: 'Incorrect password' };
  }
}

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Initialize Headers
    if (name === 'Subjects') {
      sheet.appendRow(['SubjectName']);
    } else if (name === 'Questions') {
      sheet.appendRow(['ID', 'Subject', 'Type', 'QuestionText', 'ImageURL', 'Options', 'MatchingPairs', 'CorrectAnswer', 'Points']);
    } else if (name === 'Results') {
      sheet.appendRow(['ID', 'Timestamp', 'StudentName', 'Subject', 'Score', 'TotalPoints', 'Status', 'Answers']);
    }
  }
  return sheet;
}

function setup() {
  getSheet('Subjects');
  getSheet('Questions');
  getSheet('Results');
}

function getSubjects() {
  var sheet = getSheet('Subjects');
  var data = sheet.getDataRange().getValues();
  var subjects = [];
  // Skip header
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      subjects.push({
        name: data[i][0],
        questionCount: countQuestions(data[i][0])
      });
    }
  }
  return { status: 'success', data: subjects };
}

function countQuestions(subjectName) {
  var sheet = getSheet('Questions');
  var data = sheet.getDataRange().getValues();
  var count = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === subjectName) count++;
  }
  return count;
}

function addSubject(name) {
  var sheet = getSheet('Subjects');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === name) return { status: 'error', message: 'Subject exists' };
  }
  sheet.appendRow([name]);
  return { status: 'success' };
}

function deleteSubject(name) {
  var sheet = getSheet('Subjects');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  // Delete questions for this subject
  var qSheet = getSheet('Questions');
  var qData = qSheet.getDataRange().getValues();
  for (var j = qData.length - 1; j >= 1; j--) {
    if (qData[j][1] === name) {
      qSheet.deleteRow(j + 1);
    }
  }
  return { status: 'success' };
}

function getQuestions(subject) {
  var sheet = getSheet('Questions');
  var data = sheet.getDataRange().getValues();
  var questions = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === subject) {
      // Helper to try parsing JSON, fallback to string
      var parsedAnswer = data[i][7];
      try {
        if (typeof parsedAnswer === 'string' && (parsedAnswer.startsWith('[') || parsedAnswer.startsWith('{'))) {
          parsedAnswer = JSON.parse(parsedAnswer);
        }
      } catch (e) { /* keep as string */ }

      questions.push({
        id: data[i][0],
        subject: data[i][1],
        type: data[i][2],
        questionText: data[i][3],
        imageUrl: data[i][4],
        options: data[i][5] ? JSON.parse(data[i][5]) : [],
        matchingPairs: data[i][6] ? JSON.parse(data[i][6]) : [],
        correctAnswer: parsedAnswer,
        points: data[i][8]
      });
    }
  }
  return { status: 'success', data: questions };
}

function saveQuestion(q) {
  var lock = LockService.getScriptLock();
  try {
      lock.waitLock(30000); 
  } catch (e) {
      return { status: 'error', message: 'Server busy, please try again.' };
  }

  try {
    var sheet = getSheet('Questions');
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(q.id)) {
        rowIndex = i + 1;
        break;
        }
    }

    // Handle Answer: stringify if it's an array (Enumeration)
    var answerToStore = q.correctAnswer;
    if (typeof q.correctAnswer === 'object') {
        answerToStore = JSON.stringify(q.correctAnswer);
    }
    
    var row = [
        q.id,
        q.subject,
        q.type,
        q.questionText,
        q.imageUrl,
        JSON.stringify(q.options),
        JSON.stringify(q.matchingPairs),
        answerToStore,
        q.points
    ];
    
    if (rowIndex !== -1) {
        sheet.getRange(rowIndex, 1, 1, 9).setValues([row]);
    } else {
        sheet.appendRow(row);
    }
    
    return { status: 'success' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function deleteQuestion(id, subject) {
  var sheet = getSheet('Questions');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Question not found' };
}

function submitExam(result) {
  var lock = LockService.getScriptLock();
  try {
      lock.waitLock(30000); // Wait up to 30 seconds for other submissions to finish
  } catch (e) {
      return { status: 'error', message: 'Server busy. Please try submitting again in a few seconds.' };
  }

  try {
    var sheet = getSheet('Results');
    
    // Ensure answers are stringified safely
    var answersJson = "{}";
    try {
        answersJson = JSON.stringify(result.answers || {});
    } catch(e) {
        answersJson = "{\"error\": \"Failed to stringify answers\"}";
    }

    sheet.appendRow([
        result.id,
        result.timestamp,
        result.studentName,
        result.subject,
        result.score,
        result.totalPoints,
        result.status,
        answersJson
    ]);
    
    try {
        cleanUpResults(result.subject);
    } catch(e) {
        // Ignore cleanup error to ensure exam is submitted successfully
    }
    
    return { status: 'success' };
  } catch (err) {
      return { status: 'error', message: err.toString() };
  } finally {
      lock.releaseLock();
  }
}

function cleanUpResults(subject) {
  var sheet = getSheet('Results');
  var data = sheet.getDataRange().getValues();
  var subjectRows = [];
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][3] === subject) {
      subjectRows.push({ index: i + 1, timestamp: new Date(data[i][1]) });
    }
  }
  
  // Sort by date descending (newest first)
  subjectRows.sort(function(a, b) { return b.timestamp - a.timestamp; });
  
  // Keep top 5, delete the rest
  if (subjectRows.length > 5) {
    var toDelete = subjectRows.slice(5);
    // Sort by index descending to delete from bottom up without messing up indices
    toDelete.sort(function(a, b) { return b.index - a.index; });
    
    for (var j = 0; j < toDelete.length; j++) {
      sheet.deleteRow(toDelete[j].index);
    }
  }
}

function getResults(subject) {
  var sheet = getSheet('Results');
  var data = sheet.getDataRange().getValues();
  var results = [];
  
  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    if (!subject || row[3] === subject) {
      results.push({
        id: row[0],
        timestamp: row[1],
        studentName: row[2],
        subject: row[3],
        score: row[4],
        totalPoints: row[5],
        status: row[6],
        answers: row[7] ? JSON.parse(row[7]) : {}
      });
    }
  }
  return { status: 'success', data: results };
}`;

export const AdminPanel: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Settings State
  const [customUrl, setCustomUrl] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  
  const [copied, setCopied] = useState(false);

  // Form State
  const initialFormState: Question = {
    id: '',
    subject: '',
    type: QuestionType.MULTIPLE_CHOICE,
    questionText: '',
    points: 1,
    correctAnswer: '',
    options: ['', '', '', ''],
    matchingPairs: [{ left: '', right: '' }],
    imageUrl: ''
  };
  const [formData, setFormData] = useState<Question>(initialFormState);

  useEffect(() => {
    loadSubjects();
    setCustomUrl(localStorage.getItem('eztech_script_url') || '');
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      loadQuestions(selectedSubject);
    }
  }, [selectedSubject]);

  const loadSubjects = async () => {
    setLoading(true);
    const res = await api.getSubjects();
    if (res.status === 'success' && res.data) {
      setSubjects(res.data);
    }
    setLoading(false);
  };

  const loadQuestions = async (subj: string) => {
    setLoading(true);
    const res = await api.getQuestions(subj);
    if (res.status === 'success' && res.data) {
      setQuestions(res.data);
    } else {
      setQuestions([]);
    }
    setLoading(false);
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    setLoading(true);
    try {
      const res = await api.addSubject(newSubjectName);
      if (res.status === 'success') {
        setNewSubjectName('');
        await loadSubjects();
      } else {
        alert(`Failed to add subject. \n\nBackend Message: ${res.message}\n\nPlease check your Settings to ensure you are connected to the correct Script URL.`);
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      alert('Error connecting to the backend. Please check your Settings and Script URL.');
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (subj: string) => {
    if (confirm(`Are you sure you want to delete ${subj} and all its questions?`)) {
      setLoading(true);
      await api.deleteSubject(subj);
      setSelectedSubject(null);
      await loadSubjects();
    }
  };

  const handleSaveQuestion = async () => {
    if (!selectedSubject) return;
    
    setLoading(true);
    const payload = { ...formData, subject: selectedSubject, id: formData.id || Date.now().toString() };
    
    // Cleanup data based on type
    if (payload.type !== QuestionType.MULTIPLE_CHOICE) delete payload.options;
    if (payload.type !== QuestionType.MATCHING) delete payload.matchingPairs;

    await api.saveQuestion(payload);
    setIsEditing(false);
    setFormData(initialFormState);
    await loadQuestions(selectedSubject);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!selectedSubject) return;
    if (confirm('Delete this question?')) {
      setLoading(true);
      await api.deleteQuestion(id, selectedSubject);
      await loadQuestions(selectedSubject);
    }
  };

  const openEditor = (q?: Question) => {
    if (q) {
      setFormData(q);
    } else {
      setFormData({ ...initialFormState, subject: selectedSubject || '' });
    }
    setIsEditing(true);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GAS_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = async () => {
      setTestStatus('testing');
      const oldUrl = localStorage.getItem('eztech_script_url');
      if (customUrl) {
        localStorage.setItem('eztech_script_url', customUrl);
      }
      
      try {
          const res = await api.checkAdmin('test_connection');
          if (res.message === 'Incorrect password' || res.status === 'success') {
              setTestStatus('success');
          } else {
              setTestStatus('error');
          }
      } catch (e) {
          setTestStatus('error');
      }
      
      if (!customUrl && oldUrl) localStorage.setItem('eztech_script_url', oldUrl);
  };

  const handleSaveSettings = () => {
      if (customUrl) {
          localStorage.setItem('eztech_script_url', customUrl);
      } else {
          localStorage.removeItem('eztech_script_url');
      }
      window.location.reload(); 
  };

  // Helper for Enumeration Array Change
  const updateEnumerationAnswer = (idx: number, value: string) => {
    const current = Array.isArray(formData.correctAnswer) ? [...formData.correctAnswer] : [];
    current[idx] = value;
    setFormData({ ...formData, correctAnswer: current });
  };

  const changeEnumerationCount = (count: number) => {
      if (count < 1) return;
      let current = Array.isArray(formData.correctAnswer) ? [...formData.correctAnswer] : [];
      if (typeof current === 'string') current = [current]; // Handle migration from string to array
      
      if (count > current.length) {
          // Add empty strings
          const toAdd = count - current.length;
          for(let i=0; i<toAdd; i++) current.push('');
      } else if (count < current.length) {
          // Slice
          current = current.slice(0, count);
      }
      setFormData({ ...formData, correctAnswer: current });
  };

  if (showSchemaModal) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
                 <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <Table className="text-teal-600" />
                        <h3 className="font-bold text-lg text-gray-800">Spreadsheet Schema Guide</h3>
                    </div>
                    <button onClick={() => setShowSchemaModal(false)} className="text-gray-500 hover:text-gray-800">
                        <X />
                    </button>
                </div>
                <div className="p-6 overflow-auto space-y-6">
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-4">
                        <p className="text-sm text-blue-800">
                            <strong>Tip:</strong> The easiest way to set this up is to run the <code>setup()</code> function inside the Apps Script editor. 
                            However, if you prefer to do it manually, create 3 sheets (tabs) with the exact names and headers below.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-lg text-gray-800 border-b pb-2 mb-3">1. Sheet Name: <span className="font-mono text-teal-600">Subjects</span></h4>
                        <div className="bg-gray-100 p-3 rounded font-mono text-sm overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-300">
                                        <th className="py-1 w-16 text-gray-500">Row 1</th>
                                        <th>SubjectName</th>
                                    </tr>
                                </thead>
                            </table>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-lg text-gray-800 border-b pb-2 mb-3">2. Sheet Name: <span className="font-mono text-teal-600">Questions</span></h4>
                        <div className="bg-gray-100 p-3 rounded font-mono text-sm overflow-x-auto">
                            <div className="flex gap-4 border-b border-gray-300 pb-1 mb-1 font-bold text-gray-500">Row 1 Headers:</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {['ID', 'Subject', 'Type', 'QuestionText', 'ImageURL', 'Options', 'MatchingPairs', 'CorrectAnswer', 'Points'].map((h, i) => (
                                    <div key={h} className="flex gap-2">
                                        <span className="text-gray-400 w-6">{String.fromCharCode(65 + i)}1</span>
                                        <span className="font-bold">{h}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                     <div>
                        <h4 className="font-bold text-lg text-gray-800 border-b pb-2 mb-3">3. Sheet Name: <span className="font-mono text-teal-600">Results</span></h4>
                        <div className="bg-gray-100 p-3 rounded font-mono text-sm overflow-x-auto">
                            <div className="flex gap-4 border-b border-gray-300 pb-1 mb-1 font-bold text-gray-500">Row 1 Headers:</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {['ID', 'Timestamp', 'StudentName', 'Subject', 'Score', 'TotalPoints', 'Status', 'Answers'].map((h, i) => (
                                    <div key={h} className="flex gap-2">
                                        <span className="text-gray-400 w-6">{String.fromCharCode(65 + i)}1</span>
                                        <span className="font-bold">{h}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
                    <button onClick={() => setShowSchemaModal(false)} className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">Close</button>
                </div>
            </div>
        </div>
    )
  }

  if (showSettingsModal) {
      return (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col animate-in fade-in zoom-in duration-200">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                      <div className="flex items-center gap-2">
                          <Settings className="text-teal-600" />
                          <h3 className="font-bold text-lg text-gray-800">Connection Settings</h3>
                      </div>
                      <button onClick={() => setShowSettingsModal(false)} className="text-gray-500 hover:text-gray-800">
                          <X />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <p className="text-sm text-gray-600">
                          Paste your Google Apps Script <strong>Web App URL</strong> below. 
                          This allows the app to connect to your personal Google Sheet.
                      </p>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Web App URL</label>
                          <input 
                              type="text" 
                              className="w-full border p-3 rounded text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                              placeholder="https://script.google.com/macros/s/..."
                              value={customUrl}
                              onChange={(e) => {
                                  setCustomUrl(e.target.value);
                                  setTestStatus('idle');
                              }}
                          />
                      </div>
                      
                      <div className="flex items-center gap-2">
                           <button 
                                onClick={handleTestConnection}
                                disabled={!customUrl || testStatus === 'testing'}
                                className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium border transition ${
                                    testStatus === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                                    testStatus === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                                    'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                           >
                                {testStatus === 'testing' ? <RefreshCw className="animate-spin" size={16}/> : 
                                 testStatus === 'success' ? <Check size={16}/> : 
                                 <ExternalLink size={16}/>}
                                {testStatus === 'testing' ? 'Testing...' : 
                                 testStatus === 'success' ? 'Connection Successful' : 
                                 testStatus === 'error' ? 'Connection Failed' : 'Test Connection'}
                           </button>
                      </div>

                      <div className="bg-amber-50 p-3 rounded border border-amber-100 text-amber-800 text-xs">
                          <strong>Important:</strong> Ensure your script is deployed as:
                          <ul className="list-disc pl-4 mt-1 space-y-1">
                              <li>Execute as: <strong>Me</strong></li>
                              <li>Who has access: <strong>Anyone</strong></li>
                          </ul>
                      </div>
                  </div>
                  <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end gap-2">
                      <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Cancel</button>
                      <button onClick={handleSaveSettings} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700">Save & Reload</button>
                  </div>
              </div>
          </div>
      );
  }

  if (showCodeModal) {
      return (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                      <div className="flex items-center gap-2">
                          <Code className="text-teal-600" />
                          <h3 className="font-bold text-lg text-gray-800">Backend Script (Code.gs)</h3>
                      </div>
                      <button onClick={() => setShowCodeModal(false)} className="text-gray-500 hover:text-gray-800">
                          <X />
                      </button>
                  </div>
                  <div className="flex-1 overflow-auto p-0 bg-slate-900 relative">
                      <pre className="text-green-400 font-mono text-sm p-4 whitespace-pre-wrap">{GAS_CODE}</pre>
                  </div>
                  <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
                      <button 
                          onClick={handleCopyCode}
                          className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition ${copied ? 'bg-green-600 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                      >
                          {copied ? <Check size={18} /> : <Copy size={18} />}
                          {copied ? 'Copied!' : 'Copy Code'}
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  if (!selectedSubject) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-teal-700">Manage Subjects</h2>
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="text-sm flex items-center gap-2 text-gray-600 bg-white border px-3 py-1.5 rounded hover:bg-gray-50 transition"
                    title="Connection Settings"
                >
                    <Settings size={16} />
                    <span className="hidden sm:inline">Settings</span>
                </button>
                <button 
                    onClick={() => setShowSchemaModal(true)}
                    className="text-sm flex items-center gap-2 text-gray-600 bg-white border px-3 py-1.5 rounded hover:bg-gray-50 transition"
                >
                    <Table size={16} />
                    <span className="hidden sm:inline">Schema Guide</span>
                </button>
                <button 
                    onClick={() => setShowCodeModal(true)}
                    className="text-sm flex items-center gap-2 text-gray-600 bg-white border px-3 py-1.5 rounded hover:bg-gray-50 transition"
                >
                    <Code size={16} />
                    <span className="hidden sm:inline">Get Backend Code</span>
                </button>
            </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex gap-2 mb-6">
                <input 
                    type="text" 
                    value={newSubjectName} 
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                    placeholder="New Subject Name"
                    className="flex-1 p-2 border rounded"
                />
                <button 
                    onClick={handleAddSubject}
                    className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 disabled:opacity-50"
                    disabled={loading}
                >
                    <Plus size={20} />
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map(sub => (
                    <div key={sub.name} className="bg-slate-50 p-4 rounded border flex justify-between items-center group">
                        <div onClick={() => setSelectedSubject(sub.name)} className="flex-1 cursor-pointer hover:text-teal-600">
                             <span className="font-medium block">{sub.name}</span>
                             <span className="text-xs text-gray-500">{sub.questionCount} Questions</span>
                        </div>
                        <button onClick={() => handleDeleteSubject(sub.name)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">{formData.id ? 'Edit' : 'Add'} Question - {selectedSubject}</h3>
                <button onClick={() => setIsEditing(false)} className="text-gray-500"><X /></button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select 
                        className="w-full border p-2 rounded mt-1"
                        value={formData.type}
                        onChange={(e) => {
                            const newType = e.target.value as QuestionType;
                            let newAnswer: string | string[] = '';
                            if (newType === QuestionType.ENUMERATION) {
                                newAnswer = ['']; // Initialize array
                            }
                            setFormData({...formData, type: newType, correctAnswer: newAnswer});
                        }}
                    >
                        {Object.values(QuestionType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Question Text</label>
                    <textarea 
                        className="w-full border p-2 rounded mt-1"
                        rows={3}
                        value={formData.questionText}
                        onChange={(e) => setFormData({...formData, questionText: e.target.value})}
                    />
                </div>

                <div>
                     <label className="block text-sm font-medium text-gray-700">Image URL (Optional)</label>
                     <div className="flex items-center gap-2 mt-1">
                        <ImageIcon size={20} className="text-gray-400" />
                        <input 
                            type="text" 
                            className="w-full border p-2 rounded"
                            placeholder="https://..."
                            value={formData.imageUrl || ''}
                            onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                        />
                     </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Points</label>
                    <input 
                        type="number" 
                        className="w-24 border p-2 rounded mt-1"
                        min={1}
                        value={formData.points}
                        onChange={(e) => setFormData({...formData, points: parseInt(e.target.value)})}
                    />
                </div>

                {/* Question Type Specific Fields */}
                
                {formData.type === QuestionType.TRUE_FALSE && (
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
                        <select 
                            className="w-full border p-2 rounded mt-1"
                            value={formData.correctAnswer as string}
                            onChange={(e) => setFormData({...formData, correctAnswer: e.target.value})}
                        >
                            <option value="">Select...</option>
                            <option value="TRUE">True</option>
                            <option value="FALSE">False</option>
                        </select>
                     </div>
                )}

                {formData.type === QuestionType.MULTIPLE_CHOICE && (
                    <div className="space-y-2">
                         <label className="block text-sm font-medium text-gray-700">Options</label>
                         {formData.options?.map((opt, idx) => (
                             <div key={idx} className="flex gap-2">
                                <input 
                                    type="radio" 
                                    name="correct" 
                                    checked={formData.correctAnswer === opt && opt !== ''}
                                    onChange={() => setFormData({...formData, correctAnswer: opt})}
                                />
                                <input 
                                    type="text" 
                                    className="flex-1 border p-2 rounded"
                                    value={opt}
                                    onChange={(e) => {
                                        const newOpts = [...(formData.options || [])];
                                        newOpts[idx] = e.target.value;
                                        setFormData({...formData, options: newOpts});
                                    }}
                                    placeholder={`Option ${idx + 1}`}
                                />
                             </div>
                         ))}
                    </div>
                )}

                {formData.type === QuestionType.IDENTIFICATION && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
                        <input 
                            type="text" 
                            className="w-full border p-2 rounded mt-1"
                            value={formData.correctAnswer as string}
                            onChange={(e) => setFormData({...formData, correctAnswer: e.target.value})}
                            placeholder="Answer"
                        />
                    </div>
                )}

                {formData.type === QuestionType.ENUMERATION && (
                    <div className="space-y-3 bg-gray-50 p-4 rounded border">
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Number of Items</label>
                            <input 
                                type="number" 
                                min={1}
                                max={20}
                                className="w-24 border p-2 rounded mt-1"
                                value={Array.isArray(formData.correctAnswer) ? formData.correctAnswer.length : 1}
                                onChange={(e) => changeEnumerationCount(parseInt(e.target.value))}
                            />
                         </div>
                         
                         <label className="block text-sm font-medium text-gray-700">Correct Answers</label>
                         {Array.isArray(formData.correctAnswer) && formData.correctAnswer.map((ans, idx) => (
                             <div key={idx} className="flex gap-2 items-center">
                                 <span className="text-gray-400 text-sm w-6">{idx+1}.</span>
                                 <input 
                                    type="text" 
                                    className="flex-1 border p-2 rounded"
                                    value={ans}
                                    onChange={(e) => updateEnumerationAnswer(idx, e.target.value)}
                                    placeholder={`Answer ${idx + 1}`}
                                 />
                             </div>
                         ))}
                         {(!Array.isArray(formData.correctAnswer) || formData.correctAnswer.length === 0) && (
                            <div className="text-red-500 text-sm">Please set the number of items.</div>
                         )}
                    </div>
                )}

                {formData.type === QuestionType.MATCHING && (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Pairs (Left - Right)</label>
                        {formData.matchingPairs?.map((pair, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <input 
                                    type="text" 
                                    className="flex-1 border p-2 rounded"
                                    placeholder="Question Side"
                                    value={pair.left}
                                    onChange={(e) => {
                                        const newPairs = [...(formData.matchingPairs || [])];
                                        newPairs[idx].left = e.target.value;
                                        setFormData({...formData, matchingPairs: newPairs});
                                    }}
                                />
                                <span>-</span>
                                <input 
                                    type="text" 
                                    className="flex-1 border p-2 rounded"
                                    placeholder="Match Side"
                                    value={pair.right}
                                    onChange={(e) => {
                                        const newPairs = [...(formData.matchingPairs || [])];
                                        newPairs[idx].right = e.target.value;
                                        setFormData({...formData, matchingPairs: newPairs});
                                    }}
                                />
                                <button 
                                    onClick={() => {
                                        const newPairs = formData.matchingPairs?.filter((_, i) => i !== idx);
                                        setFormData({...formData, matchingPairs: newPairs});
                                    }}
                                    className="text-red-500"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        <button 
                            type="button"
                            onClick={() => setFormData({
                                ...formData, 
                                matchingPairs: [...(formData.matchingPairs || []), {left: '', right: ''}]
                            })}
                            className="text-sm text-teal-600 font-medium"
                        >
                            + Add Pair
                        </button>
                    </div>
                )}

                <div className="pt-4 flex justify-end gap-2">
                    <button 
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveQuestion}
                        disabled={loading}
                        className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 flex items-center gap-2"
                    >
                        <Save size={18} /> Save Question
                    </button>
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
             <button onClick={() => setSelectedSubject(null)} className="text-gray-500 hover:text-gray-900">&larr; Back to Subjects</button>
             <h2 className="text-xl font-bold text-teal-700">{selectedSubject} - Questions</h2>
        </div>
        
        <div className="flex justify-end">
             <button 
                onClick={() => openEditor()}
                className="bg-teal-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-teal-700"
             >
                 <Plus size={20} /> Add Question
             </button>
        </div>

        {loading ? (
            <div className="text-center py-10">Loading questions...</div>
        ) : questions.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded border border-dashed">No questions yet for this subject.</div>
        ) : (
            <div className="space-y-4">
                {questions.map((q, idx) => (
                    <div key={q.id} className="bg-white p-4 rounded shadow-sm border flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-mono uppercase">{q.type}</span>
                                <span className="text-gray-400 text-xs">({q.points} pts)</span>
                            </div>
                            <p className="font-medium text-gray-800">{idx + 1}. {q.questionText}</p>
                            {q.imageUrl && <img src={q.imageUrl} alt="q" className="mt-2 h-20 object-contain rounded border" />}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => openEditor(q)} className="text-blue-500 hover:bg-blue-50 p-2 rounded"><Edit2 size={18} /></button>
                            <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};