import StepShell from './StepShell.jsx';
import { useReport } from '../state/ReportContext.jsx';

export default function Step2Order() {
  const { state, reorderPdfFiles, resetPdfOrder, setStep } = useReport();
  const { pdfFiles } = state;

  if (pdfFiles.length === 0) {
    return (
      <StepShell title="Ordenar laudos" description="Envie os laudos na etapa anterior para definir a ordem deles no relatório.">
        <p className="empty-note">Nenhum laudo enviado ainda.</p>
      </StepShell>
    );
  }

  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= pdfFiles.length) return;
    reorderPdfFiles(index, target);
  };

  return (
    <StepShell
      title="Ordenar laudos"
      description="Por padrão os laudos seguem ordem alfabética pelo nome do arquivo. Use as setas para ajustar a posição de qualquer unidade; essa é a ordem em que elas aparecem no PDF consolidado e na planilha."
    >
      <div className="tool-card-head">
        <span />
        <button className="sample-link as-button" onClick={resetPdfOrder}>
          Restaurar ordem alfabética
        </button>
      </div>

      <div className="order-list">
        {pdfFiles.map((file, i) => (
          <div className="order-row" key={file.name + i}>
            <span className="order-position">{i + 1}</span>
            <span className="order-name">{file.name}</span>
            <div className="order-controls">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Mover para cima">▲</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === pdfFiles.length - 1} title="Mover para baixo">▼</button>
            </div>
          </div>
        ))}
      </div>

      <div className="actions">
        <button className="primary" onClick={() => setStep(3)}>
          Ver mapa das unidades
        </button>
      </div>
    </StepShell>
  );
}
