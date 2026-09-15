import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Items from './pages/Items';
import CreateItem from './pages/CreateItem';
import ItemDetail from './pages/ItemDetail';
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
                    <Route path="items" element={<Items />} />
                    <Route path="items/create" element={<CreateItem />} />
                    <Route path="items/:id" element={<ItemDetail />} />
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
