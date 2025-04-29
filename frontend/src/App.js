import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Main from './components/Main.js';
import Account from './components/Login.js';
import CreateStegoRoom from './components/Create.js';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.js';
import StegoRoom from './pages/StegoRoom.js';
import MLSBDemo from './pages/MLSBDemo.js';
import IndivRoom from './components/Room.js';

function App() {
  return (
    <div>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/mlsb-demo" replace />} />
            <Route path="/account" element={<Account />} />
            <Route path="/create" element={<CreateStegoRoom />} />
            <Route path="/dashboard" element={<Main />} />
            <Route path="/stegoroom" element={<StegoRoom />} />
            <Route path="/mlsb-demo" element={<MLSBDemo />} />
            <Route path="/room/:roomId" element={<IndivRoom />} />
          </Routes>
        </Router>
    </div>
  );
}

export default App;
