import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import AdminLogin from './AdminLogin';

export default function AdminApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('adminToken'));
  const navigate = useNavigate();

  const handleLogin = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('adminToken', data.token);
        setIsAuthenticated(true);
        navigate('/admin/dashboard');
      } else {
        const err = await res.json();
        alert(err.error || 'بيانات الدخول غير صحيحة');
      }
    } catch (e) {
      console.error(e);
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    navigate('/admin');
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/admin/dashboard" />
          ) : (
            <AdminLogin onLogin={handleLogin} />
          )
        }
      />
      <Route
        path="/dashboard/*"
        element={
          isAuthenticated ? (
            <AdminDashboard onLogout={handleLogout} />
          ) : (
            <Navigate to="/admin" />
          )
        }
      />
    </Routes>
  );
}
