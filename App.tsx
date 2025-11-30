import React, { useState } from 'react';
import { UserRole } from './types';
import Layout from './components/Layout';
import { ExamPortal } from './components/ExamPortal';
import { AdminPanel } from './components/AdminPanel';
import { Results } from './components/Results';
import { SYSTEM_LOGO, SYSTEM_TITLE } from './constants';
import { ShieldCheck, User, ClipboardList, X, Loader } from 'lucide-react';
import { api } from './services/api';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.GUEST);
  const [view, setView] = useState<'HOME' | 'EXAM' | 'ADMIN' | 'RESULTS'>('HOME');
  
  // Admin Login State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = (selectedRole: UserRole) => {
    if (selectedRole === UserRole.STUDENT) {
      setRole(UserRole.STUDENT);
      setView('EXAM');
    } else if (selectedRole === UserRole.ADMIN) {
      setShowLoginModal(true);
      setLoginError('');
      setPassword('');
    }
  };

  const submitAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    
    try {
        const res = await api.checkAdmin(password);
        if (res.status === 'success') {
          setRole(UserRole.ADMIN);
          setView('ADMIN'); // Default to Admin Panel
          setShowLoginModal(false);
        } else {
          setLoginError(res.message || "Incorrect password");
        }
    } catch (err) {
        setLoginError("Failed to connect to server");
    } finally {
        setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setRole(UserRole.GUEST);
    setView('HOME');
  };

  const renderContent = () => {
    if (role === UserRole.GUEST) {
      return (
        <>
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12">
              <div className="text-center space-y-4">
                  <img src={SYSTEM_LOGO} alt="Logo" className="w-32 h-32 mx-auto rounded-full shadow-lg" />
                  <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{SYSTEM_TITLE}</h1>
                  <p className="text-gray-500 text-lg">Select your portal to continue</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl px-4">
                  <div 
                      onClick={() => handleLogin(UserRole.STUDENT)}
                      className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer border border-gray-100 flex flex-col items-center group text-center"
                  >
                      <div className="bg-teal-50 p-4 rounded-full mb-4 group-hover:bg-teal-100 transition">
                          <User size={48} className="text-teal-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">Student</h2>
                      <p className="text-gray-500">Access examination portal directly</p>
                  </div>

                  <div 
                      onClick={() => handleLogin(UserRole.ADMIN)}
                      className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer border border-gray-100 flex flex-col items-center group text-center"
                  >
                      <div className="bg-gray-50 p-4 rounded-full mb-4 group-hover:bg-gray-100 transition">
                          <ShieldCheck size={48} className="text-gray-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">Admin</h2>
                      <p className="text-gray-500">Manage questions and view results</p>
                  </div>
              </div>
          </div>

          {/* Admin Login Modal */}
          {showLoginModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in duration-200">
                    <button 
                        onClick={() => setShowLoginModal(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex flex-col items-center mb-6">
                        <div className="bg-gray-100 p-3 rounded-full mb-3">
                            <ShieldCheck className="text-gray-700" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Admin Access</h3>
                    </div>
                    
                    <form onSubmit={submitAdminLogin} className="space-y-4">
                        <div>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition"
                                placeholder="Enter Password"
                                autoFocus
                                disabled={loginLoading}
                            />
                            {loginError && <p className="text-red-500 text-sm mt-2 text-center">{loginError}</p>}
                        </div>
                        <button 
                            type="submit"
                            disabled={loginLoading}
                            className="w-full bg-gray-800 text-white py-3 rounded-lg font-bold hover:bg-gray-700 transition flex justify-center items-center"
                        >
                            {loginLoading ? <Loader className="animate-spin" size={20} /> : 'Login'}
                        </button>
                    </form>
                </div>
            </div>
          )}
        </>
      );
    }

    if (role === UserRole.STUDENT) {
        return <ExamPortal onComplete={() => setView('HOME')} />;
    }

    if (role === UserRole.ADMIN) {
        return (
            <div className="space-y-6">
                <div className="flex gap-4 border-b pb-4">
                    <button 
                        className={`px-4 py-2 rounded-lg font-medium transition ${view === 'ADMIN' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        onClick={() => setView('ADMIN')}
                    >
                        Question Management
                    </button>
                    <button 
                        className={`px-4 py-2 rounded-lg font-medium transition ${view === 'RESULTS' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        onClick={() => setView('RESULTS')}
                    >
                        Results & Scores
                    </button>
                </div>
                {view === 'ADMIN' ? <AdminPanel /> : <Results />}
            </div>
        );
    }
  };

  return (
    <Layout 
      userRole={role} 
      onLogout={handleLogout} 
      onHome={() => role === UserRole.GUEST ? null : setView(role === UserRole.STUDENT ? 'EXAM' : 'ADMIN')}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;