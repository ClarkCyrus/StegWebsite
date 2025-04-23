import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Main from './components/Main.js';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div>
        <Router>
          <Routes>
            <Route path="/" element={<Main />} />
          </Routes>
        </Router>
    </div>
  );
}

export default App;
