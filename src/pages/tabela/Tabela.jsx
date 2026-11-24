import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { apiDelete, apiGet, apiPost, apiPut, authStorage, openPdfInNewTab } from '../../services/api';
import './TabelaStyle.css';

const emptyForm = {
  numeroPedido: '',
  client: '',
  organizacao: '',
  type: '',
  quantity: 1,
  width: '',
  height: '',
  linha: '',
  cor: '',
  status: 'Aguardando',
};

function removerNumeros(valor) {
  return valor.replace(/[0-9]/g, '');
}

export default function Tabela() {
  const navigate = useNavigate();
  const user = authStorage.getUser();
  const podeGerenciar = user?.perfil === 'admin' || user?.perfil === 'supervisor';
  const [quantityError, setQuantityError] = useState('');
  const [widthError, setWidthError] = useState('');
  const [heightError, setHeightError] = useState('');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [etapaFilter, setEtapaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingItem, setEditingItem] = useState(null);
  const [feedback, setFeedback] = useState('');
  const dialogRef = useRef(null);

  async function carregarEsquadrias() {
    try {
      setLoading(true);
      const lista = await apiGet('/api/v1/esquadrias');
      setOrders(Array.isArray(lista) ? lista : []);
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarEsquadrias();
  }, []);

  const filtered = useMemo(() => orders.filter((item) => {
    const term = search.trim().toLowerCase();
    const matchTerm =
      !term ||
      item.codigo.toLowerCase().includes(term) ||
      item.numeroPedido.toLowerCase().includes(term) ||
      item.clienteNome.toLowerCase().includes(term) ||
      item.descricao.toLowerCase().includes(term);

    const matchEtapa = !etapaFilter || item.etapaAtualCodigo === etapaFilter;
    const matchStatus =
      !statusFilter ||
      (statusFilter === 'IMPEDIMENTO' ? item.comImpedimento : item.status === statusFilter);

    return matchTerm && matchEtapa && matchStatus;
  }), [orders, search, etapaFilter, statusFilter]);

  function openNew() {
    setQuantityError('');
    setWidthError('');
    setHeightError('');
    setEditingItem(null);
    setForm(emptyForm);
    dialogRef.current.showModal();
  }

  function edit(item) {
    setQuantityError('');
    setWidthError('');
    setHeightError('');
    setEditingItem(item);
    setForm({
      numeroPedido: item.numeroPedido,
      client: item.clienteNome,
      organizacao: item.organizacao || item.organizacaoNome || '',
      type: item.descricao,
      quantity: item.quantidade,
      width: item.larguraMm,
      height: item.alturaMm,
      linha: item.linha || '',
      cor: item.cor || '',
      status: item.status,
    });
    dialogRef.current.showModal();
  }

  async function remove(item) {
    if (!window.confirm(`Deseja excluir a esquadria ${item.codigo} (${item.clienteNome})?`)) return;
    try {
      await apiDelete(`/api/v1/esquadrias/${item.id}`);
      setFeedback(`Esquadria ${item.codigo} excluída com sucesso.`);
      await carregarEsquadrias();
    } catch (err) {
      alert(err.message);
    }
  }

  async function submit(event) {
    event.preventDefault();
    const quantidade = Number(form.quantity);
    const largura = Number(form.width);
    const altura = Number(form.height);
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 999) {
      setQuantityError('Erro: informe um número inteiro entre 1 e 999 unidades.');
      return;
    }
    if (!Number.isFinite(largura) || largura < 1 || largura > 5000) {
      setWidthError('Erro: informe uma largura entre 1 e 5.000 mm.');
      return;
    }
    if (!Number.isFinite(altura) || altura < 1 || altura > 5000) {
      setHeightError('Erro: informe uma altura entre 1 e 5.000 mm.');
      return;
    }
    setQuantityError('');
    setWidthError('');
    setHeightError('');
    try {
      if (editingItem) {
        await apiPut(`/api/v1/esquadrias/${editingItem.id}`, {
          clienteNome: form.client.trim(),
          descricao: form.type.trim(),
          larguraMm: Number(form.width),
          alturaMm: Number(form.height),
          quantidade,
          linha: form.linha.trim() || null,
          cor: form.cor.trim() || null,
          status: form.status,
        });
        setFeedback(`Esquadria ${editingItem.codigo} atualizada!`);
      } else {
        const criada = await apiPost('/api/v1/pedidos/com-esquadria', {
          numeroPedido: form.numeroPedido.trim() || null,
          clienteNome: form.client.trim(),
          organizacao: form.organizacao.trim() || null,
          descricao: form.type.trim(),
          larguraMm: Number(form.width),
          alturaMm: Number(form.height),
          quantidade,
          linha: form.linha.trim() || null,
          cor: form.cor.trim() || null,
          status: form.status,
        });
        setFeedback(`Esquadria ${criada.codigo} gerada no pedido #${criada.numeroPedido}!`);
      }
      dialogRef.current.close();
      await carregarEsquadrias();
    } catch (err) {
      alert(editingItem
        ? `Não foi possível editar a esquadria ${editingItem.codigo}. ${err.message}`
        : `Não foi possível criar o pedido/esquadria. ${err.message}`);
    }
  }

  const statusClass = (item) => {
    if (item.comImpedimento) return 'pending';
    if (item.status === 'Concluido') return 'done';
    if (item.status === 'Aguardando') return 'pending';
    return 'production';
  };

  return (
    <AppLayout>
      <div className="table-main">
        <div className="table-heading">
          <div>
            <p>Painel operacional </p>
            <h1>Pedidos &amp; Esquadrias</h1>
          </div>
          {podeGerenciar && (
            <button type="button" onClick={openNew}>＋ Novo pedido / esquadria</button>
          )}
        </div>

        {feedback && (
          <div className="table-feedback" role="status">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback('')} aria-label="Fechar aviso">×</button>
          </div>
        )}

        <section className="table-toolbar" aria-label="Filtros">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar código, pedido, cliente ou descrição"
          />
          <select value={etapaFilter} onChange={(e) => setEtapaFilter(e.target.value)} aria-label="Filtrar por etapa">
            <option value="">Etapa: Todas</option>
            <option value="PEDIDO_RECEBIDO">1. Pedido Recebido</option>
            <option value="SEPARACAO">2. Separação</option>
            <option value="CORTE">3. Corte</option>
            <option value="USINAGEM">4. Usinagem</option>
            <option value="MONTAGEM">5. Montagem</option>
            <option value="QUALIDADE">6. Qualidade</option>
            <option value="FINALIZACAO">7. Finalização</option>
            <option value="EXPEDICAO">8. Expedição</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filtrar por status">
            <option value="">Status: Todos</option>
            <option value="Aguardando">Aguardando</option>
            <option value="Em Producao">Em Produção</option>
            <option value="Concluido">Concluído</option>
            <option value="IMPEDIMENTO">Com Impedimento</option>
          </select>
          <button type="button" onClick={() => { setSearch(''); setEtapaFilter(''); setStatusFilter(''); }}>↻ Limpar</button>
        </section>

        <section className="table-stats" aria-label="Resumo">
          {[
            ['Total', orders.length],
            ['Em produção', orders.filter((o) => o.status === 'Em Producao').length],
            ['Concluídas', orders.filter((o) => o.status === 'Concluido').length],
            ['Com impedimento', orders.filter((o) => o.comImpedimento).length],
          ].map(([label, value]) => (
            <article key={label}><span>{label}</span><strong>{value}</strong></article>
          ))}
        </section>

        <section className="orders-table-card">
          <header>
            <h2>Esquadrias cadastradas</h2>
            <span>{loading ? 'Carregando...' : `${filtered.length} registro(s)`}</span>
          </header>
          <div className="orders-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Descrição</th>
                  <th>Medidas (L × A)</th>
                  <th>Etapa Atual</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="order-code">{item.codigo}</td>
                    <td>#{item.numeroPedido}</td>
                    <td>{item.clienteNome}</td>
                    <td>{item.descricao}</td>
                    <td>{Number(item.larguraMm).toLocaleString('pt-BR')} × {Number(item.alturaMm).toLocaleString('pt-BR')} mm</td>
                    <td><strong>{item.etapaAtualNome}</strong></td>
                    <td>
                      <span className={`order-status order-status--${statusClass(item)}`}>
                        {item.comImpedimento ? 'Com Impedimento' : item.status}
                      </span>
                    </td>
                    <td>
                      <div className="order-actions">
                        <button type="button" onClick={() => navigate(`/qrcode?codigo=${item.codigo}`)}>Apontar</button>
                        <button type="button" onClick={() => openPdfInNewTab(`/api/v1/etiquetas/esquadria/${item.codigo}/pdf`)}>PDF</button>
                        {podeGerenciar && <button type="button" onClick={() => edit(item)}>Editar</button>}
                        {podeGerenciar && <button className="delete" type="button" onClick={() => remove(item)}>Excluir</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filtered.length === 0 && (
              <p className="orders-empty">
                {orders.length === 0
                  ? 'Nenhuma esquadria cadastrada ainda. Clique em "＋ Novo pedido / esquadria" para adicionar.'
                  : 'Nenhuma esquadria encontrada com os filtros aplicados.'}
              </p>
            )}
          </div>
        </section>

        <dialog ref={dialogRef} onClose={() => { setForm(emptyForm); setQuantityError(''); setWidthError(''); setHeightError(''); }}>
          <form onSubmit={submit}>
            <div className="modal-heading">
              <div>
                <h2>{editingItem ? `Editar ${editingItem.codigo}` : 'Novo Pedido / Esquadria'}</h2>
                <p>O código único da esquadria será gerado automaticamente.</p>
              </div>
              <button type="button" onClick={() => dialogRef.current.close()} aria-label="Fechar">×</button>
            </div>
            {!editingItem && (
              <label>Número do pedido (opcional — gera automático se vazio)
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={50}
                  value={form.numeroPedido}
                  onChange={(e) => setForm({ ...form, numeroPedido: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="Informe o nº do pedido ou deixe em branco"
                />
              </label>
            )}
            <label>Nome do cliente
              <input
                required
                maxLength={150}
                pattern="[^\d]*"
                value={form.client}
                onChange={(e) => setForm({ ...form, client: removerNumeros(e.target.value) })}
                placeholder="Nome do cliente ou obra"
              />
            </label>
            {!editingItem && (
              <label>Organização / Empresa
                <input
                  required
                  maxLength={150}
                  pattern="[^\d]*"
                  value={form.organizacao}
                  onChange={(e) => setForm({ ...form, organizacao: removerNumeros(e.target.value) })}
                  placeholder="Nome da organização ou empresa"
                />
              </label>
            )}
            <div className="modal-grid">
              <label>Descrição / Modelo da esquadria
                <input
                  required
                  maxLength={200}
                  pattern="[^\d]*"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: removerNumeros(e.target.value) })}
                  placeholder="Informe o modelo / descrição"
                />
              </label>
              <label>Quantidade
                <input
                  type="number"
                  min="1"
                  max="999"
                  step="1"
                  required
                  aria-describedby="quantity-limit quantity-error"
                  value={form.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    const quantidade = Number(value);
                    setForm({ ...form, quantity: value });
                    if (value === '') {
                      setQuantityError('Erro: informe a quantidade. Limite máximo: 999 unidades.');
                    } else if (!Number.isInteger(quantidade)) {
                      setQuantityError('Erro: use apenas números inteiros. Limite máximo: 999 unidades.');
                    } else if (quantidade > 999) {
                      setQuantityError('Erro: limite máximo excedido. Máximo permitido: 999 unidades.');
                    } else if (quantidade < 1) {
                      setQuantityError('Erro: mínimo permitido: 1 unidade.');
                    } else {
                      setQuantityError('');
                    }
                  }}
                />
                <small id="quantity-limit" className="modal-field-help">Limite máximo: 999 unidades</small>
                {quantityError && (
                  <small id="quantity-error" className="modal-field-error" role="alert">{quantityError}</small>
                )}
              </label>
              <label>Largura (mm)
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max="5000"
                  required
                  aria-describedby="width-limit width-error"
                  value={form.width}
                  onChange={(e) => {
                    const value = e.target.value;
                    const largura = Number(value);
                    setForm({ ...form, width: value });
                    if (value === '') {
                      setWidthError('Erro: informe a largura. Limite máximo: 5.000 mm.');
                    } else if (!Number.isFinite(largura)) {
                      setWidthError('Erro: informe um valor numérico válido.');
                    } else if (largura > 5000) {
                      setWidthError('Erro: limite máximo excedido. Máximo permitido: 5.000 mm.');
                    } else if (largura < 1) {
                      setWidthError('Erro: mínimo permitido: 1 mm.');
                    } else {
                      setWidthError('');
                    }
                  }}
                  placeholder="Ex.: 1200"
                />
                <small id="width-limit" className="modal-field-help">Limite máximo: 5.000 mm</small>
                {widthError && (
                  <small id="width-error" className="modal-field-error" role="alert">{widthError}</small>
                )}
              </label>
              <label>Altura (mm)
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max="5000"
                  required
                  aria-describedby="height-limit height-error"
                  value={form.height}
                  onChange={(e) => {
                    const value = e.target.value;
                    const altura = Number(value);
                    setForm({ ...form, height: value });
                    if (value === '') {
                      setHeightError('Erro: informe a altura. Limite máximo: 5.000 mm.');
                    } else if (!Number.isFinite(altura)) {
                      setHeightError('Erro: informe um valor numérico válido.');
                    } else if (altura > 5000) {
                      setHeightError('Erro: limite máximo excedido. Máximo permitido: 5.000 mm.');
                    } else if (altura < 1) {
                      setHeightError('Erro: mínimo permitido: 1 mm.');
                    } else {
                      setHeightError('');
                    }
                  }}
                  placeholder="Ex.: 1000"
                />
                <small id="height-limit" className="modal-field-help">Limite máximo: 5.000 mm</small>
                {heightError && (
                  <small id="height-error" className="modal-field-error" role="alert">{heightError}</small>
                )}
              </label>
              <label>Linha (setor ou máquina responsável)
                <input
                  maxLength={100}
                  pattern="[^\d]*"
                  value={form.linha}
                  onChange={(e) => setForm({ ...form, linha: removerNumeros(e.target.value) })}
                  placeholder="Ex.: Corte, Montagem..."
                />
              </label>
              <label>Cor
                <input
                  maxLength={100}
                  pattern="[^\d]*"
                  value={form.cor}
                  onChange={(e) => setForm({ ...form, cor: removerNumeros(e.target.value) })}
                  placeholder="Opcional"
                />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => dialogRef.current.close()}>Cancelar</button>
              <button className="modal-save" type="submit">Salvar</button>
            </div>
          </form>
        </dialog>
      </div>
    </AppLayout>
  );
}
