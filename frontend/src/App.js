import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import MLSBDemo from './pages/MLSBDemo.js';
import Dashboard from './pages/Dashboard.js';
import CreateStegoRoom from './pages/CreateStegoRoom.js';
import StegoRoom from './pages/StegoRoom.js';
import Login from './pages/Login.js';
import Signup from './pages/Signup.js';
import QuickStego from './pages/QuickStego.js';
import { AuthProvider, useAuth } from './pages/AuthContext.js';

function App() {
  return (
    <div>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/create" element={<RequireAuth><CreateStegoRoom /></RequireAuth>} />
            <Route path="/room/:roomId" element={<RequireAuth><StegoRoom /></RequireAuth>} />
            <Route path="/mlsb-demo" element={<RequireAuth><MLSBDemo /></RequireAuth>} />
            <Route path="/quick-stego" element={<RequireAuth><QuickStego /></RequireAuth>} />
          </Routes>
        </Router>
      </AuthProvider>
    </div>
  );

  function RequireAuth({ children }) {
    const { authToken } = useAuth(); // Use the context to get the authToken

    const [countdown, setCountdown] = useState(5);
    const [showAlert, setShowAlert] = useState(false);

    if (!authToken) {
      if (!showAlert) {
        setShowAlert(true); 
        const interval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval); 
              navigate('/login');
            }
            return prev - 1; 
          });
      }, 1000); 
    }
      return (
        <>
          {showAlert && (
            <div style={{ color: 'red', margin: '50px' }}>
              You need to log in to access this page. Redirecting to login page in {countdown} seconds...
            </div>
          )}
        </>
      );
    }

      return children;
  }

}
export default App;
