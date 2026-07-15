import { useState, useEffect, useRef } from 'react';
import StepShell from './StepShell.jsx';
import { useReport } from '../state/ReportContext.jsx';

const STATUS_IDLE = 'idle';
const STATUS_PROCESSING = 'processing';
const STATUS_DONE = 'done';
const STATUS_ERROR = 'error';

function StatCard({ label, value }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

export default function Step6Generate() {
  const { state, setStep } = useReport();
  const [status, setStatus] = useState(STATUS_IDLE);
  const [log, setLog] = useState([]);
  const [stats, setStats] = useState(null);
  const [downloads, setDownloads] = useState(null);
  const [error, setError] = useState(null);
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../worker/vistoriaWorker.js', import.meta.url), { type: 'module' });
    return () => workerRef.current?.terminate();
  }, []);

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

    const filesData = await Promise.all(state.pdfFiles.map(async (file) => ({
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

  if (state.pdfFiles.length === 0) {
    return (
      <StepShell title="Gerar relatório" description="Envie os laudos PDF antes de gerar o relatório.">
        <button className="primary" onClick={() => setStep(1)}>Ir para a etapa de laudos</button>
      </StepShell>
    );
  }

  return (
    <StepShell title="Gerar relatório" description="Revise as etapas anteriores e gere a planilha e o PDF consolidado.">
      <div className="review-summary">
        <div className="review-item"><span>Laudos enviados</span><strong>{state.pdfFiles.length}</strong></div>
        <div className="review-item"><span>Unidades reconhecidas</span><strong>{state.detectedUnits.length}</strong></div>
        <div className="review-item"><span>Obra</span><strong>{state.reportData.obra || 'não preenchido'}</strong></div>
      </div>

      <div className="actions">
        <button className="primary" disabled={isBusy} onClick={process}>
          Processar vistorias
        </button>
      </div>

      {(isBusy || status === STATUS_DONE || status === STATUS_ERROR) && (
        <div className="status-panel show">
          <div className="status-title">
            {isBusy && <span className="spinner" />}
            {status === STATUS_PROCESSING && 'Processando...'}
            {status === STATUS_DONE && 'Concluído'}
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
                <a className="download-btn" href={downloads.xlsxUrl} download={`Relatorio_Vistorias_${stamp}.xlsx`}>Baixar planilha (.xlsx)</a>
                <a className="download-btn secondary" href={downloads.pdfUrl} download={`Relatorio_Consolidado_${stamp}.pdf`}>Baixar PDF consolidado</a>
              </div>
            </>
          )}
        </div>
      )}
    </StepShell>
  );
}
