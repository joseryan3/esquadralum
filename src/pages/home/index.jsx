import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { apiGet, authStorage } from '../../services/api';
import './styleHome.css';

function Icon({ type }) {
  const paths = {
    box: <><path d="M12 3 4 7.2v9.6l8 4.2 8-4.2V7.2L12 3Zm0 2.2 5.7 3L12 11.1 6.3 8.2 12 5.2ZM6 9.9l5 2.6v5.8l-5-2.6V9.9Zm7 8.4v-5.8l5-2.6v5.8l-5 2.6Z" /></>,
    check: <><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5 7.1-6.3 6.3-3.2-3.2 1.4-1.4 1.8 1.8 4.9-4.9L17 9Z" /></>,
    clock: <><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 5v4.5l3.6 2.1-.9 1.5-4.7-2.7V7h2Z" /></>,
    chart: <><path d="M4 20V10h4v10H4Zm6 0V4h4v16h-4Zm6 0v-7h4v7h-4Z" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg>;
}

export default function Home() {
  const user = authStorage.getUser();
  const podeCadastrar = user?.perfil === 'admin' || user?.perfil === 'supervisor';
  const [dashboard, setDashboard] = useState(null);
  const [esquadrias, setEsquadrias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        const [dashData, esqData] = await Promise.all([
          apiGet('/api/v1/dashboard'),
          apiGet('/api/v1/esquadrias'),
        ]);
        setDashboard(dashData);
        setEsquadrias(Array.isArray(esqData) ? esqData.slice(0, 8) : []);
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  const resumo = [
    { label: 'Esquadrias em produção', value: dashboard?.esquadriasEmProducao ?? 0, note: 'Em andamento', tone: 'blue', icon: 'box' },
    { label: 'Esquadrias expedidas', value: dashboard?.esquadriasConcluidas ?? 0, note: 'Concluídas', tone: 'green', icon: 'check' },
    { label: 'Aguardando início', value: dashboard?.esquadriasAguardando ?? 0, note: 'Pendentes', tone: 'orange', icon: 'clock' },
    { label: 'Total de esquadrias', value: dashboard?.totalEsquadrias ?? 0, note: `${dashboard?.esquadriasComImpedimento ?? 0} impedimento(s)`, tone: 'purple', icon: 'chart' },
  ];

  function pillClass(esq) {
    if (esq.comImpedimento) return 'pendente';
    if (esq.status === 'Concluido') return 'done';
    if (esq.status === 'Aguardando') return 'pendente';
    return 'em-producao';
  }

  return (
    <AppLayout>
      <div className="home-main">
        <div className="home-heading">
          <div>
            <p className="eyebrow">Visão geral</p>
            <h1>Painel de Monitoramento</h1>
            <p>Acompanhe o resumo da produção em tempo real</p>
          </div>
          {podeCadastrar && (
            <Link className="new-order" to="/tabela">＋ Novo pedido</Link>
          )}
        </div>

        <section className="summary-grid" aria-label="Resumo da produção">
          {resumo.map((item) => (
            <article className="summary-card" key={item.label}>
              <div className="summary-card__head">
                <span className={`summary-icon summary-icon--${item.tone}`}><Icon type={item.icon} /></span>
                <span>{item.label}</span>
              </div>
              <strong>{item.value}</strong>
              <span className={`summary-note summary-note--${item.tone}`}>{item.note}</span>
            </article>
          ))}
        </section>

        {dashboard?.funilEtapas && (
          <section className="recent-orders" aria-label="Funil de etapas">
            <div className="section-heading">
              <h2>Distribuição por Etapa Produtiva</h2>
            </div>
            <div className="funnel-grid">
              {dashboard.funilEtapas.map((et) => (
                <div className="funnel-card" key={et.codigo}>
                  <span className="funnel-card__step">{et.ordem}. {et.nome}</span>
                  <strong className="funnel-card__count">{et.quantidade}</strong>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="recent-orders" aria-labelledby="recent-title">
          <div className="section-heading">
            <h2 id="recent-title">Últimas esquadrias em produção</h2>
            <Link to="/tabela">Ver todas <span aria-hidden="true">→</span></Link>
          </div>
          <div className="table-shell">
            <table className="orders-preview">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Descrição</th>
                  <th>Medidas</th>
                  <th>Etapa</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {esquadrias.map((esq) => (
                  <tr key={esq.id}>
                    <td>
                      <Link to={`/qrcode?codigo=${esq.codigo}`} style={{ color: '#3867bd', fontWeight: 800, textDecoration: 'none' }}>
                        {esq.codigo}
                      </Link>
                    </td>
                    <td>#{esq.numeroPedido}</td>
                    <td>{esq.clienteNome}</td>
                    <td>{esq.descricao}</td>
                    <td>{Number(esq.larguraMm).toLocaleString('pt-BR')} × {Number(esq.alturaMm).toLocaleString('pt-BR')} mm</td>
                    <td><strong>{esq.etapaAtualNome}</strong></td>
                    <td>
                      <span className={`status-pill status-pill--${pillClass(esq)}`}>
                        {esq.comImpedimento ? 'Com Impedimento' : esq.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && esquadrias.length === 0 && (
              <p className="home-empty">
                Nenhuma esquadria cadastrada ainda. Acesse <Link to="/tabela">Pedidos &amp; Esquadrias</Link> para cadastrar a primeira.
              </p>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
