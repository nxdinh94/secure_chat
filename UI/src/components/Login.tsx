import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { authAPI } from '../services/api';

interface LoginProps {
  onLoginSuccess: (username: string) => void;
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login(username, password);
      onLoginSuccess(response.username);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#667eea' }}>
          🔐 SecureChat Login
        </h2>
        <p style={{ color: '#666' }}>Sign in to start secure messaging</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <div className="button-group">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <LogIn size={20} />
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <p style={{ color: '#666' }}>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                fontWeight: 'bold',
                textDecoration: 'underline',
              }}
            >
              Register here
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;
