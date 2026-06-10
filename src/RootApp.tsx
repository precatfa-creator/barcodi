import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import App from './App';
import LandingPage from './LandingPage';

// The admin area (dashboard, Excel import, QR codes) is only used by store
// owners. Lazy-load it so shoppers never download that code on the public
// scanner routes.
const AdminApp = lazy(() => import('./admin/AdminApp'));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-primary-main">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );
}

export default function RootApp() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/store/:storeId" element={<App />} />
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<RouteFallback />}>
            <AdminApp />
          </Suspense>
        }
      />
    </Routes>
  );
}
