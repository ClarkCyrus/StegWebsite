import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiLogIn } from 'react-icons/fi';
import './Auth.css';
import { useAuth } from '../pages/AuthContext';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

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
      await axios.post('http://localhost:5000/api/login', { email: normalizedEmail, password }, { withCredentials: true });
      const fakeToken = '123456'; 
      login(fakeToken);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      // Extract the Google credential (JWT token)
      const token = credentialResponse.credential;

      const nonceResponse = await axios.get('http://localhost:5000/api/google/login', { withCredentials: true });
      const nonce = nonceResponse.data.nonce;
  
      // Send the token to the backend for verification and login
      const response = await axios.post(
        'http://localhost:5000/api/google/callback',
        { token, nonce }, // Send the token in the request body
        { withCredentials: true } // Include cookies for session handling
      );
  
      // Extract user data from the backend response
      const userData = response.data;
      
      // Store user data in localStorage for persistence
      localStorage.setItem('user', JSON.stringify(userData));
      // Log the user in using the backend response
      login(userData); // Assuming `login` sets the user context or token
  
      // Navigate to the dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Google login failed:', err);
      setError('Google login failed. Please try again.');
    }
  };

  const handleGoogleFailure = () => {
    setError('Google login failed. Please try again.');
  };

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
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
          <div className="google-login-container mt-4">
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={handleGoogleFailure}
              />
          </div>
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
  </GoogleOAuthProvider>
  );
}

export default Login; 