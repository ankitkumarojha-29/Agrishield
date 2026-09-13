import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Farmers from './pages/Farmers';
import FarmsMap from './pages/FarmsMap';
import FarmDetail from './pages/FarmDetail';
import AddFarm from './pages/AddFarm';
import CropScan from './pages/CropScan';
import SoilAnalysis from './pages/SoilAnalysis';
import WeatherIrrigation from './pages/WeatherIrrigation';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Revenue from './pages/Revenue';
import Profile from './pages/Profile';
import Register from './pages/Register';
import AdminApprovals from './pages/AdminApprovals';
import { RoleProvider } from './context/RoleContext';

function App() {
  return (
    <RoleProvider>
      <Router>
        <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Main Application Routes wrapped in Layout */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Farm & Agronomic Intelligence Platform */}
          <Route path="/farms" element={<FarmsMap />} />
          <Route path="/farms-map" element={<FarmsMap />} />
          <Route path="/farms/:id" element={<FarmDetail />} />
          <Route path="/add-farm" element={<AddFarm />} />
          <Route path="/crop-scan" element={<CropScan />} />
          <Route path="/soil-analysis" element={<SoilAnalysis />} />
          <Route path="/weather-irrigation" element={<WeatherIrrigation />} />
          <Route path="/alerts" element={<Alerts />} />
          
          {/* Community & Admin Management */}
          <Route path="/farmers" element={<Farmers />} />
          <Route path="/admin-approvals" element={<AdminApprovals />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/revenue" element={<Revenue />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </RoleProvider>
  );
}

export default App;
