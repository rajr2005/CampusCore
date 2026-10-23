import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, CreditCard, BarChart3, Users, FileText, Settings, LogOut, GraduationCap, Receipt, BookOpen } from 'lucide-react';

function Sidebar({ role, onLogout }) {
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Income', path: '/income', icon: <Wallet size={20} /> },
    { name: 'Expenses', path: '/expenses', icon: <CreditCard size={20} /> },
    { name: 'Reports', path: '/reports', icon: <BarChart3 size={20} /> },
    { name: 'Employees', path: '/employees', icon: <Users size={20} /> },
    { name: 'Payslips', path: '/payslips', icon: <FileText size={20} /> },
    { name: 'Students', path: '/students', icon: <GraduationCap size={20} /> },
    { name: 'Courses', path: '/courses', icon: <BookOpen size={20} /> },
    { name: 'Bill Generator', path: '/bills', icon: <Receipt size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ].filter((item) => (
    role === 'admin' || ['/employees', '/students', '/courses', '/bills'].includes(item.path)
  ));

  return (
    <div className="w-64 bg-white shadow-lg hidden md:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <NavLink to="/" className="text-xl font-bold text-primary truncate">STS</NavLink>
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-emerald-50 text-primary font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <span className="mr-3">{item.icon}</span>
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={onLogout}
          className="flex items-center w-full px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut size={20} className="mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
