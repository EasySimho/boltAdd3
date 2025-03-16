import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserRegistration } from './components/UserRegistration';
import { ShiftList } from './components/ShiftList';
import { ShiftDetail } from './components/ShiftDetail';
import { AdminDashboard } from './components/AdminDashboard';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route 
            path="/" 
            element={user ? <Navigate to="/shifts" /> : <UserRegistration />} 
          />
          <Route 
            path="/shifts" 
            element={user ? <ShiftList /> : <Navigate to="/" />} 
          />
          <Route 
            path="/shifts/:id" 
            element={user ? <ShiftDetail /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin" 
            element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} 
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App