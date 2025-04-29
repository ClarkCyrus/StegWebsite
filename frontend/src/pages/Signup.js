import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Signup.css'; // Ensure this CSS file includes layout styles

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Normalize email by converting to lowercase
    const normalizedEmail = email.toLowerCase();

    // Client-side regex validation for email
    if (!emailRegex.test(normalizedEmail)) {
      setError('Invalid email format.');
      return;
    }

    // Client-side regex validation for password
    if (!passwordRegex.test(password)) {
      setError('Password must be 8-20 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.');
      return;
    }


        
    try {
      await axios.post('http://localhost:5000/api/signup', { email: normalizedEmail, password });
      setSuccess('Account created! You can now log in.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError('Signup failed. Email may already be in use.');
    }
  };

  return (
    <div className="signup-wrapper">
      <div className="signup-card">
        <div className="signup-image"></div> {/* Image on the left */}
        <div className="signup-form">
          <h2 className="mb-3">Sign Up</h2>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="form-control"
              />
            </div>
            <div className="mb-3">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="form-control"
              />
            </div>
            <button type="submit" className="btn btn-primary w-100">Sign Up</button>
          </form>
          <div className="mt-3 text-center login-link">
            <a href="/login" className="login-link">Already have an account? Log in</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
