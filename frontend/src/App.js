import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Main from './components/Main.js';
import Account from './components/Login.js';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div>
        <Router>
          <Routes>
            <Route path="/" element={<Main />} />
            <Route path="/account" element={<Account />} />
          </Routes>
        </Router>
    </div>
  );
}

export default App;
