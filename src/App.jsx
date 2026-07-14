import { useState, useCallback, useRef, useEffect } from 'react';
import './App.css';

const STATUS_IDLE = 'idle';
const STATUS_PROCESSING = 'processing';
const STATUS_DONE = 'done';
const STATUS_ERROR = 'error';

const EXAMPLE_ZIP_URL = `${import.meta.env.BASE_URL}vistorias-exemplo.zip`;

function formatKB(bytes) {
  return (bytes / 1024).toFixed(0);
}

function FileRow({ file }) {
  return (
    <div className="file-row">
      <span>📄</span>
      <span className="name">{file.name}</span>
      <span className="badge">{formatKB(file.size)} KB</span>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <div className="feature-title">{title}</div>
      <div className="feature-text">{text}</div>
    </div>
  );
}

export default function App() {
  const [queue, setQueue] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState(STATUS_IDLE);
  const [log, setLog] = useState([]);
  const [stats, setStats] = useState(null);
  const [downloads, setDownloads] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker/vistoriaWorker.js', import.meta.url), { type: 'module' });
    return () => workerRef.current?.terminate();
  }, []);

  const addFiles = useCallback((fileList) => {
    const pdfs = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    setQueue(prev => [...prev, ...pdfs]);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const clearQueue = () => setQueue([]);
  const appendLog = (line) => setLog(prev => [...prev, line]);

  const process = async () => {
    setStatus(STATUS_PROCESSING);
    setLog([]);
    setStats(null);
    setError(null);
    if (downloads) {
      URL.revokeObjectURL(downloads.xlsxUrl);
      URL.revokeObjectURL(downloads.pdfUrl);
      setDownloads(null);
    }

    appendLog('Lendo arquivos e processando no seu navegador (extraindo, classificando, extraindo fotos e mesclando)...');

    const filesData = await Promise.all(queue.map(async (file) => ({
      filename: file.name,
      arrayBuffer: await file.arrayBuffer(),
    })));

    const worker = workerRef.current;

    worker.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === 'log') {
        appendLog(msg.message);
      } else if (msg.type === 'done') {
        const xlsxBlob = new Blob([msg.xlsxBytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const pdfBlob = new Blob([msg.pdfBytes], { type: 'application/pdf' });
        setDownloads({
          xlsxUrl: URL.createObjectURL(xlsxBlob),
          pdfUrl: URL.createObjectURL(pdfBlob),
        });
        setStats(msg.stats);
        setStatus(STATUS_DONE);
        setQueue([]);
      } else if (msg.type === 'error') {
        setStatus(STATUS_ERROR);
        setError(msg.message);
      }
    };

    worker.postMessage(
      { type: 'process', files: filesData },
      filesData.map(f => f.arrayBuffer),
    );
  };

  const isBusy = status === STATUS_PROCESSING;
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <div className="page">
      <div className="wrap">

        <header className="hero">
          <span className="eyebrow">100% no navegador · nenhum arquivo é enviado a servidores</span>
          <h1>🏗️ Extrator de Vistorias</h1>
          <p className="subtitle">
            Transforme um lote de laudos PDF de vistoria numa planilha Excel formatada
            (com farol de controle e foto de cada não conformidade) e num PDF único
            consolidado com mapa clicável — em segundos, direto no navegador.
          </p>
        </header>

        <section className="features">
          <FeatureCard
            icon="🗂️"
            title="Extração automática"
            text="Lê todos os PDFs, identifica cada não conformidade e classifica por categoria (pintura, piso, esquadrias, elétrica...)."
          />
          <FeatureCard
            icon="🚦"
            title="Farol de controle"
            text="Planilha com aba executiva: cada unidade classificada em Regular, Atenção ou Crítico, com foto embutida na célula."
          />
          <FeatureCard
            icon="🗺️"
            title="PDF com mapa clicável"
            text="Todos os laudos mesclados num único PDF, com mapa das unidades na capa e botão de voltar em toda página."
          />
        </section>

        <section className="tool-card">
          <div className="tool-card-head">
            <h2>Processar vistorias</h2>
            <a className="sample-link" href={EXAMPLE_ZIP_URL} download>
              ⬇ Baixar 5 vistorias de exemplo para testar
            </a>
          </div>

          <div
            className={`dropzone${dragOver ? ' dragover' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <div className="icon">📄</div>
            <div className="main-text">Arraste os PDFs aqui</div>
            <div className="sub-text">ou clique para selecionar os arquivos</div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {queue.length > 0 && (
            <div className="file-list show">
              <div className="file-count-bar">
                <span>{queue.length} arquivo{queue.length === 1 ? '' : 's'}</span>
                <button className="clear-btn" onClick={clearQueue}>limpar</button>
              </div>
              {queue.map((f, i) => <FileRow key={i} file={f} />)}
            </div>
          )}

          <div className="actions">
            <button className="primary" disabled={queue.length === 0 || isBusy} onClick={process}>
              Processar vistorias
            </button>
          </div>

          {(isBusy || status === STATUS_DONE || status === STATUS_ERROR) && (
            <div className="status-panel show">
              <div className="status-title">
                {isBusy && <span className="spinner" />}
                {status === STATUS_PROCESSING && 'Processando...'}
                {status === STATUS_DONE && '✅ Concluído'}
                {status === STATUS_ERROR && 'Erro ao processar'}
              </div>

              {log.length > 0 && <div className="log">{log.join('\n')}</div>}
              {error && <div className="log">Erro: {error}</div>}

              {stats && downloads && (
                <>
                  <div className="stats-grid">
                    <StatCard label="Arquivos processados" value={stats.totalArquivos} />
                    <StatCard label="Não conformidades" value={stats.totalNaoConformidades} />
                    <StatCard label="Com foto anexada" value={stats.totalComFoto} />
                    <StatCard label="Unidades mescladas" value={stats.totalUnidadesMescladas} />
                    <StatCard label="Páginas no PDF final" value={stats.totalPaginasConsolidado} />
                  </div>

                  <div className="download-row">
                    <a className="download-btn" href={downloads.xlsxUrl} download={`Relatorio_Vistorias_${stamp}.xlsx`}>⬇ Baixar planilha (.xlsx)</a>
                    <a className="download-btn secondary" href={downloads.pdfUrl} download={`Relatorio_Consolidado_${stamp}.pdf`}>⬇ Baixar PDF consolidado</a>
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        <footer className="page-footer">
          Nenhum PDF sai do seu computador — todo o processamento roda localmente,
          dentro do seu navegador.
        </footer>

      </div>
    </div>
  );
}
