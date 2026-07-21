import { useState, useCallback, useRef } from 'react';
import StepShell from './StepShell.jsx';
import { useReport } from '../state/ReportContext.jsx';

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

export default function Step1Upload() {
  const { state, addPdfFiles, clearPdfFiles, setStep } = useReport();
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const addFiles = useCallback((fileList) => {
    const pdfs = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length > 0) addPdfFiles(pdfs);
  }, [addPdfFiles]);

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

  return (
    <StepShell
      title="Laudos PDF"
      description="Arraste os laudos de vistoria. A ferramenta identifica as unidades automaticamente pelo nome do arquivo e já monta um mapa inicial na próxima etapa."
    >
      <div className="tool-card-head">
        <span />
        <a className="sample-link" href={EXAMPLE_ZIP_URL} download>
          Baixar 5 vistorias de exemplo para testar
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

      {state.pdfFiles.length > 0 && (
        <div className="file-list show">
          <div className="file-count-bar">
            <span>{state.pdfFiles.length} arquivo{state.pdfFiles.length === 1 ? '' : 's'} · {state.detectedUnits.length} unidade{state.detectedUnits.length === 1 ? '' : 's'} reconhecida{state.detectedUnits.length === 1 ? '' : 's'}</span>
            <button className="clear-btn" onClick={clearPdfFiles}>limpar</button>
          </div>
          {state.pdfFiles.map((f, i) => <FileRow key={i} file={f} />)}
        </div>
      )}

      {state.pdfFiles.length > 0 && (
        <div className="actions">
          <button className="primary" onClick={() => setStep(2)}>
            Ordenar laudos
          </button>
        </div>
      )}
    </StepShell>
  );
}
