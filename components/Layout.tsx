import React from 'react';
import { SYSTEM_LOGO, SYSTEM_TITLE } from '../constants';
import { LogOut, Home } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  userRole: string;
  onLogout: () => void;
  onHome: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, userRole, onLogout, onHome }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center cursor-pointer" onClick={onHome}>
              <img className="h-10 w-10 rounded-full mr-3" src={SYSTEM_LOGO} alt="Logo" />
              <span className="font-bold text-xl text-teal-600">{SYSTEM_TITLE}</span>
            </div>
            <div className="flex items-center space-x-4">
               {userRole !== 'GUEST' && (
                 <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                   {userRole}
                 </span>
               )}
               {userRole !== 'GUEST' && (
                  <button 
                    onClick={onHome}
                    className="p-2 text-gray-500 hover:text-teal-600 transition"
                    title="Home"
                  >
                    <Home size={20} />
                  </button>
               )}
               {userRole !== 'GUEST' && (
                  <button 
                    onClick={onLogout}
                    className="p-2 text-gray-500 hover:text-red-600 transition"
                    title="Logout"
                  >
                    <LogOut size={20} />
                  </button>
               )}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 flex justify-center text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} {SYSTEM_TITLE}. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Layout;