import React from 'react';
import { Bell, User, LogOut } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';

function Topbar({ selectedMonth, setSelectedMonth, onLogout }) {
  const handlePrevMonth = () => setSelectedMonth(subMonths(selectedMonth, 1));
  const handleNextMonth = () => setSelectedMonth(addMonths(selectedMonth, 1));

  return (
    <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10">
      <div className="flex items-center">
        {/* Mobile menu button could go here */}
      </div>

      <div className="flex items-center space-x-4 bg-gray-50 rounded-lg p-1">
        <button
          onClick={handlePrevMonth}
          className="px-3 py-1 text-gray-500 hover:text-gray-900 transition-colors"
        >
          &larr;
        </button>
        <div className="font-medium text-gray-900 min-w-[120px] text-center">
          {format(selectedMonth, 'MMMM yyyy')}
        </div>
        <button
          onClick={handleNextMonth}
          className="px-3 py-1 text-gray-500 hover:text-gray-900 transition-colors"
        >
          &rarr;
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <button className="text-gray-500 hover:text-primary transition-colors">
          <Bell size={20} />
        </button>
        <div className="h-8 w-8 bg-emerald-100 text-primary rounded-full flex items-center justify-center">
          <User size={18} />
        </div>
        <button onClick={onLogout} className="text-gray-500 hover:text-red-500 transition-colors ml-4 flex items-center justify-center" title="Logout">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}

export default Topbar;
