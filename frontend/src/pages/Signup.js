import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiUserPlus } from 'react-icons/fi';
import './Auth.css';
import config from '../config';

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

    if (!emailRegex.test(normalizedEmail)) {
      setError('Invalid email format.');
      return;
    }

    if (!passwordRegex.test(password)) {
      setError('Password must be 8-20 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const response = await axios.post(`${config.API_BASE_URL}/api/signup`, { email: normalizedEmail, password }, { withCredentials: true });
      
      if (response.data.user_id) {
        // Verify the session is established
        const userResponse = await axios.get(`${config.API_BASE_URL}/api/current_user`, { withCredentials: true });
        if (userResponse.data.id) {
          navigate('/dashboard');
        } else {
          setError('Authentication failed after signup');
        }
      } else {
        setError('Signup successful but session not established');
      }
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
        <div className="auth-image-section auth-img">
          <div className="auth-image-content">
            <p className="auth-image-subtitle">Hide your messages in plain sight</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
