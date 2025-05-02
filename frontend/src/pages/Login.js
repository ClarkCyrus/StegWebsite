import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiLogIn } from 'react-icons/fi';
import './Auth.css';
import { useAuth } from '../pages/AuthContext';
import API_BASE_URL from '../config';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.toLowerCase();

    try {
      await axios.post(`${API_BASE_URL}/api/login`, { email: normalizedEmail, password }, { withCredentials: true });
      const fakeToken = '123456'; 
      login(fakeToken);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-form-section">
          <h1 className="auth-title">Welcome Back</h1>
          {error && <div className="alert alert-danger">{error}</div>}
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
            <button type="submit" className="auth-button">
              <FiLogIn size={20} style={{ marginRight: '8px' }} />
              Login
            </button>
          </form>
          <div className="auth-link">
            Don't have an account? <a href="/signup">Sign up</a>
          </div>
        </div>
        <div className="auth-image-section">
          <div className="auth-image-content">
            <h2 className="auth-image-title">StegoWeb</h2>
            <p className="auth-image-subtitle">Hide your messages in plain sight</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login; 