import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Farmers from './pages/Farmers';
import FarmsMap from './pages/FarmsMap';
import Claims from './pages/Claims';
import Policies from './pages/Policies';
import Verification from './pages/Verification';
import Reports from './pages/Reports';
import Revenue from './pages/Revenue';
import Profile from './pages/Profile';
import Register from './pages/Register';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Admin Dashboard Routes wrapped in Layout */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/farmers" element={<Farmers />} />
          <Route path="/farms-map" element={<FarmsMap />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/claims" element={<Claims />} />
          <Route path="/revenue" element={<Revenue />} />
          <Route path="/verification" element={<Verification />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
