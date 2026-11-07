import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { RoleProvider } from './context/RoleContext';
import RouteProgressBar from './components/common/RouteProgressBar';

// Route-Level Code Splitting: Pages load on-demand, reducing initial JS bundle by >50%
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Farmers = lazy(() => import('./pages/Farmers'));
const FarmsMap = lazy(() => import('./pages/FarmsMap'));
const FarmDetail = lazy(() => import('./pages/FarmDetail'));
const AddFarm = lazy(() => import('./pages/AddFarm'));
const CropScan = lazy(() => import('./pages/CropScan'));
const SoilAnalysis = lazy(() => import('./pages/SoilAnalysis'));
const WeatherIrrigation = lazy(() => import('./pages/WeatherIrrigation'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Reports = lazy(() => import('./pages/Reports'));
const Revenue = lazy(() => import('./pages/Revenue'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminApprovals = lazy(() => import('./pages/AdminApprovals'));

function App() {
  return (
    <RoleProvider>
      <Router>
        <Suspense fallback={<RouteProgressBar />}>
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
              <Route path="/crop-monitoring" element={<FarmsMap />} />
              <Route path="/farms/:id" element={<FarmDetail />} />
              <Route path="/add-farm" element={<AddFarm />} />
              <Route path="/crop-scan" element={<CropScan />} />
              <Route path="/crop-health" element={<CropScan />} />
              <Route path="/soil-analysis" element={<SoilAnalysis />} />
              <Route path="/crop-suitability" element={<SoilAnalysis />} />
              <Route path="/weather-irrigation" element={<WeatherIrrigation />} />
              <Route path="/irrigation-planning" element={<WeatherIrrigation />} />
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
        </Suspense>
      </Router>
    </RoleProvider>
  );
}

export default App;
