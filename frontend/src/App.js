import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MLSBDemo from './pages/MLSBDemo.js';
import Dashboard from './pages/Dashboard.js';
import CreateStegoRoom from './pages/CreateStegoRoom.js';
import StegoRoom from './pages/StegoRoom.js';
import Login from './pages/Login.js';
import Signup from './pages/Signup.js';

function App() {
  return (
    <div>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<CreateStegoRoom />} />
            <Route path="/room/:roomId" element={<StegoRoom />} />
            <Route path="/mlsb-demo" element={<MLSBDemo />} />
          </Routes>
        </Router>
    </div>
  );
}

export default App;
