import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BirthdayAlerts from '../components/BirthdayAlerts';

function DashboardAdmin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: 'horarios', icon: '📅', label: 'Quadro de Horários' },
    { to: 'ficha', icon: '📋', label: 'Ficha Cadastral' },
    { to: 'anamnese', icon: '🩺', label: 'Anamnese' },
    { to: 'alunas', icon: '👥', label: 'Alunas' },
    { to: 'financeiro', icon: '💰', label: 'Financeiro' },
    { to: 'treinos', icon: '📊', label: 'Treinos Geral' },
    { to: 'ex-alunas', icon: '📋', label: 'Ex-Alunas' },
    { to: 'equipe', icon: '👩‍🏫', label: 'Equipe' },
    { to: 'configuracoes', icon: '⚙️', label: 'Configurações' },
  ];

  return (
    <div className="dashboard">
      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <img
              src={`${process.env.PUBLIC_URL}/logo.png`}
              alt="Magli"
              style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid var(--primary)', objectFit: 'contain' }}
            />
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--primary)', fontWeight: 'bold' }}>
              Magli Admin
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            Treinamento Feminino
          </p>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
            Bem-vinda, {user?.nome}
          </p>
        </div>

        <nav>
          <ul className="sidebar-nav">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
              <a href="/" onClick={handleLogout} style={{ color: 'var(--primary)' }}>
                <span>🚪</span>
                Sair
              </a>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content" onClick={() => menuOpen && setMenuOpen(false)}>
        <BirthdayAlerts />
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardAdmin;