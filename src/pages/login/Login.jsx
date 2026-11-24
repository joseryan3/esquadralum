import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import icone from '../../Assets/icone.png';
import logo from '../../Assets/logo.png';
import logoRodape from '../../Assets/logo-rodape.png';
import { apiPost, authStorage } from '../../services/api';
import './LoginStyle.css';

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (authStorage.isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      setError('Preencha o e-mail e a senha.');
      return;
    }

    try {
      setLoading(true);
      const data = await apiPost('/api/v1/auth/login', {
        email: form.email.trim(),
        senha: form.password,
      });
      authStorage.setSession(data.token, data.usuario);
      navigate('/');
    } catch (err) {
      setError(err.message || 'E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  function preencherPerfil(email, password) {
    setForm({ email, password });
    setError('');
  }

  return (
    <div className="login-page">
      <header className="login-header">
        <Link className="login-brand" to="/login" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={icone} alt="" style={{ width: 38, height: 38, objectFit: 'contain' }} />
          <img src={logo} alt="Esquadralum" />
        </Link>
        <nav><Link to="/login" aria-current="page">Acesso ao Sistema</Link></nav>
      </header>

      <main className="login-main">
        <form className="login-card" onSubmit={submit} noValidate>
          <div className="login-mark" aria-hidden="true">E</div>
          <h1>Bem-vindo</h1>
          <p className="login-subtitle">Entre para acessar o painel de produção</p>
          <label>
            E-mail
            <div className="login-input">
              <span aria-hidden="true">@</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="seu@esquadralum.com.br"
                autoComplete="email"
              />
            </div>
          </label>
          <label>
            Senha
            <div className="login-input">
              <span aria-hidden="true">#</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Digite sua senha"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? 'Autenticando...' : 'Entrar'}
          </button>

          <div style={{ marginTop: 16, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => preencherPerfil('operador@esquadralum.com.br', 'Operador@123')} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #dfe5ef', background: '#f7f9fd', cursor: 'pointer' }}>Operador</button>
            <button type="button" onClick={() => preencherPerfil('gestao@esquadralum.com.br', 'Gestao@123')} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #dfe5ef', background: '#f7f9fd', cursor: 'pointer' }}>Gestão</button>
          </div>
        </form>
      </main>

      <footer className="login-footer">
        <img src={logoRodape} alt="Esquadralum" />
        <span className="login-footer-line" />
        <a href="mailto:suporte@esquadralum.com">Suporte Técnico e Contato</a>
      </footer>
    </div>
  );
}
