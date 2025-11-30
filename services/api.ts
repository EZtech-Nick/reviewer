import { GOOGLE_SCRIPT_URL as DEFAULT_URL } from '../constants';
import { ApiResponse, Question, ExamResult, Subject } from '../types';

/**
 * Helper to get the active Script URL.
 * Checks localStorage for a custom URL set by the Admin, otherwise uses default.
 */
const getScriptUrl = () => {
  return localStorage.getItem('eztech_script_url') || DEFAULT_URL;
};

/**
 * Helper to make requests to the Google Script Web App.
 * Note: Google Apps Script Web Apps often require handling redirects and CORS.
 * We use text/plain for POST to avoid CORS preflight complex issues in GAS,
 * and the backend script handles parsing.
 */
async function fetchGas<T>(action: string, payload: any = {}): Promise<ApiResponse<T>> {
  const url = getScriptUrl();
  console.log(`[API] Sending ${action} to ${url}`, payload); // Added payload logging

  try {
    const response = await fetch(url, {
      method: 'POST',
      redirect: "follow", 
      headers: {
        "Content-Type": "text/plain", 
      },
      body: JSON.stringify({ action, ...payload }),
    });

    const text = await response.text();
    // Sometimes GAS returns redirects or HTML errors if not configured right
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error(`Failed to parse JSON response for action '${action}' from URL '${url}'. Response content:`, text);
      return { status: 'error', message: 'Invalid response from server. Please check your Script URL settings in Admin Panel.' };
    }
  } catch (error) {
    console.error(`API Error for action '${action}':`, error);
    return { status: 'error', message: 'Network error or Invalid URL. Please check your internet connection.' };
  }
}

export const api = {
  getSubjects: () => fetchGas<Subject[]>('getSubjects'),
  
  getQuestions: (subject: string) => fetchGas<Question[]>('getQuestions', { subject }),
  
  saveQuestion: (question: Question) => fetchGas<void>('saveQuestion', { question }),
  
  deleteQuestion: (id: string, subject: string) => fetchGas<void>('deleteQuestion', { id, subject }),
  
  submitExam: (result: ExamResult) => fetchGas<void>('submitExam', { result }),
  
  getResults: (subject?: string) => fetchGas<ExamResult[]>('getResults', { subject }),
  
  deleteSubject: (subject: string) => fetchGas<void>('deleteSubject', { subject }),
  
  addSubject: (subject: string) => fetchGas<void>('addSubject', { subject }),

  checkAdmin: (password: string) => fetchGas<void>('checkAdmin', { password }),
};