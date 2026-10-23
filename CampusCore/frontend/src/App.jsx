import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Income from './pages/Income';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import EmployeeManagement from './pages/EmployeeManagement';
import PayslipGenerator from './pages/PayslipGenerator';
import StudentManagement from './pages/StudentManagement';
import BillGenerator from './pages/BillGenerator';
import CourseManagement from './pages/CourseManagement';
import Login from './pages/Login';
import { DataProvider } from './context/DataContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('finance_auth_token');
  });
  const [userRole, setUserRole] = useState(() => localStorage.getItem('finance_auth_role'));
  const [checkingSession, setCheckingSession] = useState(
    () => !!localStorage.getItem('finance_auth_token') && !localStorage.getItem('finance_auth_role')
  );
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    if (!isAuthenticated || userRole) return;

    const token = localStorage.getItem('finance_auth_token');
    axios.get('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        localStorage.setItem('finance_auth_role', data.role);
        setUserRole(data.role);
      })
      .catch((error) => {
        console.error('Unable to restore the authenticated session:', error);
        localStorage.removeItem('finance_auth_token');
        localStorage.removeItem('finance_auth_role');
        setIsAuthenticated(false);
      })
      .finally(() => setCheckingSession(false));
  }, [isAuthenticated, userRole]);

  const handleLogin = ({ token, role }) => {
    localStorage.setItem('finance_auth_token', token);
    localStorage.setItem('finance_auth_role', role);
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('finance_auth_token');
    localStorage.removeItem('finance_auth_role');
    setUserRole(null);
    setIsAuthenticated(false);
  };

  if (checkingSession) {
    return <div className="flex min-h-screen items-center justify-center text-gray-600">Checking sign-in…</div>;
  }

  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <DataProvider onLogout={handleLogout} role={userRole}>
      <Router>
        <div className="flex h-screen bg-gray-50 font-sans">
          <Sidebar role={userRole} onLogout={handleLogout} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Topbar selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} onLogout={handleLogout} />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
              <Routes>
                <Route path="/" element={<Navigate to={userRole === 'subadmin' ? '/bills' : '/dashboard'} replace />} />
                <Route path="/dashboard" element={userRole === 'admin' ? <Dashboard selectedMonth={selectedMonth} /> : <Navigate to="/bills" replace />} />
                <Route path="/income" element={userRole === 'admin' ? <Income selectedMonth={selectedMonth} /> : <Navigate to="/bills" replace />} />
                <Route path="/expenses" element={userRole === 'admin' ? <Expenses selectedMonth={selectedMonth} /> : <Navigate to="/bills" replace />} />
                <Route path="/reports" element={userRole === 'admin' ? <Reports selectedMonth={selectedMonth} /> : <Navigate to="/bills" replace />} />
                <Route path="/employees" element={<EmployeeManagement />} />
                <Route path="/payslips" element={userRole === 'admin' ? <PayslipGenerator /> : <Navigate to="/bills" replace />} />
                <Route path="/students" element={<StudentManagement />} />
                <Route path="/courses" element={<CourseManagement />} />
                <Route path="/bills" element={<BillGenerator />} />
                <Route path="/settings" element={userRole === 'admin' ? <Settings /> : <Navigate to="/bills" replace />} />
                <Route path="*" element={<Navigate to={userRole === 'subadmin' ? '/bills' : '/dashboard'} replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </DataProvider>
  );
}

export default App;
