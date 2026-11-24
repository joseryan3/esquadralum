import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import icone from '../Assets/icone.png';
import logo from '../Assets/logo.png';
import logoRodape from '../Assets/logo-rodape.png';
import { authStorage } from '../services/api';
import './AppLayout.css';

const PERFIL_LABEL = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  operador: 'Operador',
};

export default function AppLayout({ children }) {
  const navigate = useNavigate();
  const user = authStorage.getUser();
  const [menuOpen, setMenuOpen] = useState(false);

  function sair() {
    authStorage.clearSession();
    navigate('/login');
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar__inner">
          <Link className="app-brand" to="/" onClick={closeMenu} aria-label="Esquadralum - Página inicial">
            <img src={icone} alt="" />
            <img src={logo} alt="Esquadralum" />
          </Link>

          <button
            type="button"
            className="app-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? '✕ Fechar' : '☰ Menu'}
          </button>

          <div id="main-navigation" className={`app-topbar__menu ${menuOpen ? 'is-open' : ''}`}>
            <nav className="app-nav" aria-label="Menu principal">
              <NavLink
                to="/"
                end
                onClick={closeMenu}
                className={({ isActive }) => `app-nav__link ${isActive ? 'active' : ''}`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm8 0h8V11h-8v9Zm0-16v5h8V4h-8Z" />
                </svg>
                <span>Painel</span>
              </NavLink>

              <NavLink
                to="/tabela"
                onClick={closeMenu}
                className={({ isActive }) => `app-nav__link ${isActive ? 'active' : ''}`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 5h18v4H3V5Zm0 6h18v3H3v-3Zm0 5h18v3H3v-3Z" />
                </svg>
                <span>Pedidos &amp; Esquadrias</span>
              </NavLink>

              <NavLink
                to="/qrcode"
                onClick={closeMenu}
                className={({ isActive }) => `app-nav__link ${isActive ? 'active' : ''}`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm10 0h2v2h-2v-2Zm4 0h2v4h-4v-2h2v-2Zm-4 4h2v2h-2v-2Zm4 2h2v2h-2v-2Z" />
                </svg>
                <span>Apontamento QR</span>
              </NavLink>
            </nav>

            <div className="app-user-area">
              {user && user.perfil !== 'admin' && (
                <div className="app-user-badge" title={user.email}>
                  <strong>{user.nome}</strong>
                  <span>{PERFIL_LABEL[user.perfil] || user.perfil}</span>
                </div>
              )}
              <button type="button" className="app-logout-btn" onClick={sair}>
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-content">{children}</main>

      <footer className="app-footer">
        <div className="app-footer__inner">
          <img src={logoRodape} alt="Esquadralum" />
          <a href="mailto:suporte@esquadralum.com">Suporte Técnico e Contato</a>
        </div>
      </footer>
    </div>
  );
}
