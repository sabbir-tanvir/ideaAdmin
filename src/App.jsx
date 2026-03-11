import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/Layout/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import './styles/layout.css';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        {/* Future nested routes will go here */}
        {/* <Route path="users" element={<Users />} /> */}
        {/* <Route path="products" element={<Products />} /> */}
        {/* <Route path="orders" element={<Orders />} /> */}
        {/* <Route path="analytics" element={<Analytics />} /> */}
        {/* <Route path="notifications" element={<Notifications />} /> */}
        {/* <Route path="settings" element={<Settings />} /> */}
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
