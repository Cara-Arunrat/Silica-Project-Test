import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    
    const success = await login(username.trim(), password.trim());
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card card">
        <h1 className="logo text-center mb-lg">SilicaOps</h1>
        <h2 className="text-xl font-bold mb-md text-center">Secure Sign In</h2>
        <p className="text-secondary text-center mb-lg text-sm">
          Enter your credentials to access the operations dashboard.
        </p>

        {error && (
          <div className="error-alert mb-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input 
              type="text" 
              className="form-control" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Enter username"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary w-full mt-md"
            disabled={loading || !username.trim() || !password.trim()}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--bg-color);
          padding: var(--spacing-md);
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          padding: var(--spacing-xl);
        }
        .text-center { text-align: center; }
        .w-full { width: 100%; }
        .error-alert {
          background-color: var(--danger-bg);
          color: var(--danger-color);
          padding: 12px;
          border-radius: var(--border-radius);
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
