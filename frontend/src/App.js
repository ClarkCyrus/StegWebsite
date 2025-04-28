import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Main from './components/Main.js';
import Account from './components/Login.js';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.js';
import StegoRoom from './pages/StegoRoom.js';

function App() {
  return (
    <div>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/stegoroom" replace />} />
            <Route path="/account" element={<Account />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/stegoroom" element={<StegoRoom />} />
          </Routes>
        </Router>
    </div>
  );
}

export default App;
