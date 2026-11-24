import './App.css';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/home';
import Login from './pages/login/Login';
import Qrcode from './pages/qrcode/Qrcode';
import Tabela from './pages/tabela/Tabela';
import { authStorage } from './services/api';

function PrivateRoute({ children }) {
  if (!authStorage.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/qrcode"
          element={
            <PrivateRoute>
              <Qrcode />
            </PrivateRoute>
          }
        />
        <Route
          path="/tabela"
          element={
            <PrivateRoute>
              <Tabela />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;