import React from 'react';

export default function BottomNav({ currentView, setView, cartCount }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#111827]/90 backdrop-blur-md border-t border-gray-800 py-3 px-6 flex justify-around items-center z-50 max-w-md mx-auto rounded-t-2xl shadow-2xl">
      <button 
        onClick={() => setView('HOME')} 
        className={`p-2 transition ${currentView === 'HOME' ? 'text-blue-400 scale-110' : 'text-gray-400 hover:text-gray-200'}`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
      </button>
      
      <button 
        onClick={() => setView('CART')} 
        className={`relative p-2 transition ${currentView === 'CART' ? 'text-blue-400 scale-110' : 'text-gray-400 hover:text-gray-200'}`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {cartCount}
          </span>
        )}
      </button>

      <button 
        onClick={() => setView('NOTIFICATIONS')} 
        className={`p-2 transition ${currentView === 'NOTIFICATIONS' ? 'text-blue-400 scale-110' : 'text-gray-400 hover:text-gray-200'}`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
      </button>

      <button 
        onClick={() => setView('PROFILE')} 
        className={`p-2 transition ${currentView === 'PROFILE' ? 'text-blue-400 scale-110' : 'text-gray-400 hover:text-gray-200'}`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
      </button>
    </div>
  );
}