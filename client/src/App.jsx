import ManagementPanel from './pages/ManagementPanel'
import './App.css'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AddPlantSpecies from './pages/AddPlantSpecies';
import AddPot from './pages/AddPot';

function App() {
  return (
    <Router>
      <div className="App">
        <nav>
          <ul>
            <li><Link to="/">ניהול עציץ</Link></li>
            <li><Link to="/add-plant-species">הוספת זן חדש</Link></li>
            <li><Link to="/add-pot">הוספת עציץ חדש</Link></li>
          </ul>
        </nav>
        <Routes>
          <Route path="/" element={<ManagementPanel />} />
          <Route path="/add-plant-species" element={<AddPlantSpecies />} />
          <Route path="/add-pot" element={<AddPot />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App
