import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Builder from './pages/Builder';
import PublishedPreview from './pages/PublishedPreview';
import ProjectAnalytics from './pages/ProjectAnalytics';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Navigate to="/" replace state={{ auth: 'login' }} />} />
      <Route path="/register" element={<Navigate to="/" replace state={{ auth: 'register' }} />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id"
        element={
          <ProtectedRoute>
            <Builder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id/analytics"
        element={
          <ProtectedRoute>
            <ProjectAnalytics />
          </ProtectedRoute>
        }
      />
      <Route path="/p/:id" element={<PublishedPreview />} />
    </Routes>
  );
}
