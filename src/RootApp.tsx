import { Routes, Route } from 'react-router-dom';
import App from './App';
import AdminApp from './admin/AdminApp';
import LandingPage from './LandingPage';

export default function RootApp() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/store/:storeId" element={<App />} />
      <Route path="/admin/*" element={<AdminApp />} />
    </Routes>
  );
}
