import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Card } from 'react-bootstrap';
import axios from 'axios';

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await axios.post('http://localhost:5000/api/signup', { email, password });
      setSuccess('Account created! You can now log in.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError('Signup failed. Email may already be in use.');
    }
  };

  return (
    <Container className="mt-4" style={{ maxWidth: '400px' }}>
      <Card className="p-4">
        <h2 className="mb-4">Sign Up</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </Form.Group>
          <Button type="submit" variant="primary" style={{ width: '100%' }}>Sign Up</Button>
        </Form>
        <div className="mt-3 text-center">
          <a href="/login">Already have an account? Log in</a>
        </div>
      </Card>
    </Container>
  );
}

export default Signup; 