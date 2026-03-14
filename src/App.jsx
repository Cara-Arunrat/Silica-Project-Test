import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import './index.css';

// Higher order component for route protection
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="p-xl text-center">Loading session...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <div className="p-xl text-danger">Unauthorized access. Please contact an Admin.</div>;
  }
  
  return children;
};

// Application Router Wrapper
function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Application Routes wrapped in AppShell */}
        <Route 
          path="/*" 
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
