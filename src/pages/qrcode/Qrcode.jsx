import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { apiGet, apiPost, openPdfInNewTab } from '../../services/api';
import './QrcodeStyle.css';

const ETAPAS_SEQUENCIA = [
  'Pedido Recebido',
  'Separação',
  'Corte',
  'Usinagem',
  'Montagem',
  'Qualidade',
  'Finalização',
  'Expedição',
];

const ETAPAS_RETORNO = [
  { ordem: 1, codigo: 'PEDIDO_RECEBIDO', nome: 'Pedido Recebido' },
  { ordem: 2, codigo: 'SEPARACAO', nome: 'Separação' },
  { ordem: 3, codigo: 'CORTE', nome: 'Corte' },
  { ordem: 4, codigo: 'USINAGEM', nome: 'Usinagem' },
  { ordem: 5, codigo: 'MONTAGEM', nome: 'Montagem' },
  { ordem: 6, codigo: 'QUALIDADE', nome: 'Qualidade' },
  { ordem: 7, codigo: 'FINALIZACAO', nome: 'Finalização' },
];

export default function Qrcode() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('codigo') || '');
  const [esquadria, setEsquadria] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cameraAtiva, setCameraAtiva] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const carregarEsquadria = useCallback(async (codigoRaw) => {
    const normalized = (codigoRaw || '').trim().toUpperCase();
    if (!normalized) return;
    setError('');
    setMessage('');
    try {
      const [dados, hist] = await Promise.all([
        apiGet(`/api/v1/esquadrias/codigo/${encodeURIComponent(normalized)}`),
        apiGet(`/api/v1/esquadrias/${encodeURIComponent(normalized)}/historico`),
      ]);
      setCode(dados.codigo);
      setEsquadria(dados);
      setHistorico(hist);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    const initial = searchParams.get('codigo');
    if (initial) {
      carregarEsquadria(initial);
    }
    return () => pararCamera();
  }, [searchParams, carregarEsquadria]);

  async function iniciarCamera() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Câmera indisponível neste navegador/dispositivo. Digite o código da esquadria ao lado.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraAtiva(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);

      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128'] });
        const interval = setInterval(async () => {
          if (!videoRef.current || !streamRef.current) {
            clearInterval(interval);
            return;
          }
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const lido = barcodes[0].rawValue;
              clearInterval(interval);
              pararCamera();
              carregarEsquadria(lido);
            }
          } catch {
            // aguarda próximo frame
          }
        }, 500);
      }
    } catch {
      setError('Não foi possível acessar a câmera. Verifique a permissão ou digite o código ao lado.');
    }
  }

  function pararCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraAtiva(false);
  }

  async function avancarEtapa() {
    if (!esquadria) return;
    setError('');
    try {
      const atualizada = await apiPost(`/api/v1/esquadrias/${esquadria.codigo}/avancar-etapa`, {
        observacao: notes.trim() || null,
      });
      setNotes('');
      setMessage(`Etapa atualizada para: ${atualizada.etapaAtualNome}`);
      await carregarEsquadria(atualizada.codigo);
    } catch (err) {
      setError(err.message);
    }
  }

  async function registrarImpedimento() {
    if (!esquadria) return;
    const motivo = notes.trim() || window.prompt('Informe o motivo obrigatório do impedimento:');
    if (!motivo || !motivo.trim()) return;
    setError('');
    try {
      await apiPost(`/api/v1/esquadrias/${esquadria.codigo}/impedimento`, { motivo: motivo.trim() });
      setNotes('');
      setMessage('Impedimento registrado com sucesso.');
      await carregarEsquadria(esquadria.codigo);
    } catch (err) {
      setError(err.message);
    }
  }

  async function resolverImpedimento() {
    if (!esquadria) return;
    setError('');
    try {
      await apiPost(`/api/v1/esquadrias/${esquadria.codigo}/resolver-impedimento`, {
        observacao: notes.trim() || 'Impedimento resolvido no chão de fábrica.',
      });
      setNotes('');
      setMessage('Impedimento resolvido. Produção liberada.');
      await carregarEsquadria(esquadria.codigo);
    } catch (err) {
      setError(err.message);
    }
  }

  async function registrarOcorrencia() {
    if (!esquadria) return;
    const descricao = notes.trim() || window.prompt('Descreva a ocorrência de qualidade ou refugo:');
    if (!descricao || !descricao.trim()) return;

    const etapasAnteriores = ETAPAS_RETORNO.filter((e) => e.ordem < esquadria.etapaAtualOrdem);
    let reprovar = false;
    let etapaDestino = 'MONTAGEM';

    if (etapasAnteriores.length > 0) {
      reprovar = window.confirm('Deseja REPROVAR e retornar a esquadria para uma etapa anterior? (OK = Sim, Cancelar = Apenas registrar refugo/ocorrência)');
      if (reprovar) {
        const opcoes = etapasAnteriores.map((e) => `${e.ordem} - ${e.nome}`).join('\n');
        const etapaAnteriorImediata = String(etapasAnteriores[etapasAnteriores.length - 1].ordem);
        const escolha = window.prompt(`Informe o número da etapa de retorno:\n${opcoes}`, etapaAnteriorImediata);
        if (!escolha) return;

        const selecionada = etapasAnteriores.find((e) => String(e.ordem) === escolha.trim());
        if (!selecionada) {
          setError('Etapa de retorno inválida.');
          return;
        }
        etapaDestino = selecionada.codigo;
      }
    }

    const refugo = Number(window.prompt('Quantidade de peças refugadas (0 se não houver):', '0') || 0);

    setError('');
    try {
      await apiPost(`/api/v1/esquadrias/${esquadria.codigo}/ocorrencia`, {
        descricao: descricao.trim(),
        reprovarNaQualidade: reprovar,
        etapaDestinoRetorno: etapaDestino,
        refugoQuantidade: refugo,
      });
      setNotes('');
      setMessage(reprovar ? 'Esquadria reprovada e retornada no processo.' : 'Ocorrência registrada no histórico imutável.');
      await carregarEsquadria(esquadria.codigo);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AppLayout>
      <div className="qr-main">
        {!esquadria ? (
          <section className="scanner-card" aria-labelledby="scanner-title">
            <div className="scanner-side">
              <p className="scanner-kicker">Leitor QR Code</p>
              <h1 id="scanner-title">Escaneie a Etiqueta</h1>
              {cameraAtiva ? (
                <div style={{ width: '100%', maxWidth: 240 }}>
                  <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 12, border: '2px solid #3867bd' }} />
                  <button type="button" className="back-button" style={{ marginTop: 8 }} onClick={pararCamera}>Fechar câmera</button>
                </div>
              ) : (
                <button className="qr-target" type="button" onClick={iniciarCamera} aria-label="Ativar câmera para leitura de QR Code">
                  <span /><span /><span /><span />
                  <div className="qr-pattern"><i /><i /><i /></div>
                </button>
              )}
              <small>Clique no quadro acima para ler pela câmera</small>
            </div>
            <div className="scanner-divider"><span>ou</span></div>
            <form className="scanner-side" onSubmit={(e) => { e.preventDefault(); carregarEsquadria(code); }}>
              <p className="scanner-kicker">Código único </p>
              <h2>Digite o código</h2>
              <label htmlFor="production-code">Código da esquadria</label>
              <input
                id="production-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex.: ESQ-00001"
                autoComplete="off"
              />
              {error && <p style={{ color: '#b83b4b', fontSize: 12, marginTop: 8 }}>{error}</p>}
              <button className="scan-submit" type="submit">Acessar produção</button>
            </form>
          </section>
        ) : (
          <section className="production-layout" aria-label="Dados da produção">
            <article className="production-card">
              <header>Identificação da Esquadria</header>
              <div className="production-card-body">
                <div className="window-preview"><span /><span /></div>
                <dl>
                  <div><dt>Código</dt><dd>{esquadria.codigo}</dd></div>
                  <div><dt>Pedido</dt><dd>#{esquadria.numeroPedido} • {esquadria.clienteNome}</dd></div>
                  <div><dt>Descrição</dt><dd>{esquadria.descricao}</dd></div>
                  <div><dt>Medidas</dt><dd>{esquadria.larguraMm} × {esquadria.alturaMm} mm</dd></div>
                  <div><dt>Linha / Cor</dt><dd>{esquadria.linha || '-'} / {esquadria.cor || '-'}</dd></div>
                </dl>
                <button
                  type="button"
                  className="notes-submit"
                  style={{ background: '#263c70', marginTop: 12 }}
                  onClick={() => openPdfInNewTab(`/api/v1/etiquetas/esquadria/${esquadria.codigo}/pdf`)}
                >
                  Imprimir Etiqueta PDF 
                </button>
              </div>
            </article>

            <article className="production-card">
              <header>Sequência de Etapas </header>
              <div className="production-card-body timeline">
                {ETAPAS_SEQUENCIA.map((label, index) => {
                  const step = index + 1;
                  const atual = esquadria.etapaAtualOrdem;
                  return (
                    <div className={`timeline-step ${step < atual ? 'done' : step === atual ? 'active' : ''}`} key={label}>
                      <b>{step < atual ? '✓' : step}</b>
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            </article>

            <div className="production-aside">
              <article className="production-card">
                <header>Status &amp; Apontamento</header>
                <div className="production-card-body">
                  <span
                    className="production-status"
                    style={esquadria.comImpedimento ? { background: '#fff0f2', color: '#b83b4b' } : undefined}
                  >
                    <i style={esquadria.comImpedimento ? { background: '#b83b4b' } : undefined} />
                    {esquadria.comImpedimento ? `COM IMPEDIMENTO: ${esquadria.motivoImpedimento}` : `${esquadria.status} • ${esquadria.etapaAtualNome}`}
                  </span>

                  <textarea
                    style={{ marginTop: 12 }}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observação do apontamento, motivo de impedimento ou ocorrência..."
                  />

                  {error && <p style={{ color: '#b83b4b', fontSize: 12, marginTop: 8 }}>{error}</p>}
                  {message && <p className="production-message" role="status">{message}</p>}

                  {!esquadria.comImpedimento ? (
                    <>
                      <button
                        className="notes-submit"
                        type="button"
                        disabled={esquadria.etapaAtualCodigo === 'EXPEDICAO'}
                        onClick={avancarEtapa}
                        style={{ height: 48, background: '#18835b' }}
                      >
                        {esquadria.proximaEtapaNome && esquadria.etapaAtualCodigo !== 'EXPEDICAO'
                          ? `Avançar para: ${esquadria.proximaEtapaNome}`
                          : 'Esquadria Expedida'}
                      </button>
                      <button
                        className="notes-submit"
                        type="button"
                        onClick={registrarImpedimento}
                        style={{ height: 44, background: '#b87420' }}
                      >
                        Registrar Impedimento 
                      </button>
                    </>
                  ) : (
                    <button
                      className="notes-submit"
                      type="button"
                      onClick={resolverImpedimento}
                      style={{ height: 48, background: '#3867bd' }}
                    >
                      Resolver Impedimento e Liberar
                    </button>
                  )}

                  <button
                    className="notes-submit"
                    type="button"
                    onClick={registrarOcorrencia}
                    style={{ height: 44, background: '#b83b4b' }}
                  >
                    Ocorrência / Refugo 
                  </button>
                </div>
              </article>

              <article className="production-card">
                <header>Histórico de Movimentações</header>
                <div className="production-card-body" style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {historico.map((h) => (
                    <div key={h.id} style={{ borderBottom: '1px solid #edf0f5', padding: '8px 0', fontSize: 11 }}>
                      <strong>{h.tipoMovimentacao}</strong>: {h.etapaAnterior} → <strong>{h.novaEtapa}</strong>
                      {h.observacao && <div style={{ color: '#526078' }}>{h.observacao}</div>}
                      <div style={{ color: '#7b879c' }}>{h.responsavelNome} • {new Date(h.dataHora).toLocaleString('pt-BR')}</div>
                    </div>
                  ))}
                </div>
              </article>

              <button className="back-button" type="button" onClick={() => { pararCamera(); setEsquadria(null); setCode(''); setError(''); setMessage(''); }}>
                ← Buscar outro código
              </button>
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}