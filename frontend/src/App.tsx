import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Castings from './pages/Castings';
import CreateCasting from './pages/CreateCasting';
import CastingDetail from './pages/CastingDetail';
import RoundDetail from './pages/RoundDetail';
import Layout from './components/Layout';
import { UserProvider } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { UserCacheProvider } from './context/UserCacheContext';
import { ConfigProvider } from './context/ConfigContext';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <UserCacheProvider>
          <ConfigProvider>
            <UserProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="castings" element={<Castings />} />
                    <Route path="castings/create" element={<CreateCasting />} />
                    <Route path="castings/:castingId" element={<CastingDetail />} />
                    <Route path="rounds/:roundId" element={<RoundDetail />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </UserProvider>
          </ConfigProvider>
        </UserCacheProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
