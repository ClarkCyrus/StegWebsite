import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Card } from 'react-bootstrap';
import axios from 'axios';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.toLowerCase();

    try {
      await axios.post('http://localhost:5000/api/login', { email: normalizedEmail, password }, { withCredentials: true });
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    // full‐screen flex container
    <Container
      fluid
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: '100vh' }}
    >
      {/* fixed‐width card, centered automatically by flex */}
      <Card className="login-card p-0 d-flex flex-row" style={{ maxWidth: '800px', width: '100%' }}>
  {/* Left Side: Form */}
  <div className="login-form p-4" style={{ flex: 1 }}>
    <h2 className="mb-4 text-center">Login</h2>
    {error && <div className="alert alert-danger">{error}</div>}
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>Email</Form.Label>
        <Form.Control
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Password</Form.Label>
        <Form.Control
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </Form.Group>
      <Button type="submit" variant="primary" style={{ width: '100%' }}>
        Login
      </Button>
    </Form>
    <div className="mt-3 text-center signup-link">
      <a href="/signup" style={{color:'inherit', textDecoration:'none'}}>Don't have an account? Sign up!</a>
    </div>
  </div>

  {/* Right Side: Image or Decoration */}
  <div className="login-image" style={{ flex: 1, backgroundSize: 'cover', backgroundPosition: 'center' }}>
    {/* Optional overlay or design here */}
  </div>
</Card>

    </Container>
  );
}
export default Login; 