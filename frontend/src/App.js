import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ConnectionStatus from './components/ConnectionStatus';
import Landing from './pages/Landing';
import Login from './pages/Login';
import DashboardEquipe from './pages/DashboardEquipe';
import DashboardAdmin from './pages/DashboardAdmin';
import FichaCadastral from './pages/FichaCadastral';
import TrocaTreinos from './pages/TrocaTreinos';
import QuadroHorarios from './pages/QuadroHorarios';
import Financeiro from './pages/Financeiro';
import ExAlunas from './pages/ExAlunas';
import Usuarios from './pages/Usuarios';
import Configuracoes from './pages/Configuracoes';
import AlunasList from './pages/AlunasList';
import Anamnese from './pages/Anamnese';
import Controle from './pages/Fiscal';
import './App.css';

// Componente para proteger rotas
function PrivateRoute({ children, adminOnly }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/admin" />;
  }

  if (adminOnly && user.perfil !== 'admin') {
    return <Navigate to="/equipe" />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<Landing />} />

      {/* Login */}
      <Route path="/admin" element={<Login />} />

      {/* Área da Equipe */}
      <Route
        path="/equipe/*"
        element={
          <PrivateRoute adminOnly={false}>
            <DashboardEquipe />
          </PrivateRoute>
        }
      >
        <Route path="ficha" element={<FichaCadastral />} />
        <Route path="ficha/:id" element={<FichaCadastral />} />
        <Route path="treinos" element={<TrocaTreinos />} />
        <Route path="horarios" element={<QuadroHorarios />} />
        <Route index element={<Navigate to="horarios" />} />
      </Route>

      {/* Área Administrativa */}
      <Route
        path="/admin/dashboard/*"
        element={
          <PrivateRoute adminOnly={true}>
            <DashboardAdmin />
          </PrivateRoute>
        }
      >
        <Route path="equipe" element={<Usuarios />} />
        <Route path="ficha" element={<FichaCadastral />} />
        <Route path="ficha/:id" element={<FichaCadastral />} />
        <Route path="anamnese" element={<Anamnese />} />
        <Route path="anamnese/:id" element={<Anamnese />} />
        <Route path="alunas" element={<AlunasList />} />
        <Route path="financeiro/*" element={<Financeiro />} />
        <Route path="fiscal" element={<Controle />} />
        <Route path="treinos" element={<TrocaTreinos geral={true} />} />
        <Route path="ex-alunas" element={<ExAlunas />} />
        <Route path="horarios" element={<QuadroHorarios />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route index element={<Navigate to="horarios" />} />
      </Route>

      {/* Redirecionamento padrão */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  const basename = '';

  return (
    <Router basename={basename}>
      <AuthProvider>
        <ConnectionStatus />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;