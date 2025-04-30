import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiUserPlus } from 'react-icons/fi';
import './Auth.css';

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const normalizedEmail = email.toLowerCase();

    try {
      await axios.post('http://localhost:5000/api/signup', { email: normalizedEmail, password }, { withCredentials: true });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during signup');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-form-section">
          <h1 className="auth-title">Create Account</h1>
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
                placeholder="Create a password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm your password"
              />
            </div>
            <button type="submit" className="auth-button">
              <FiUserPlus size={20} style={{ marginRight: '8px' }} />
              Sign Up
            </button>
          </form>
          <div className="auth-link">
            Already have an account? <a href="/login">Login</a>
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

export default Signup;
