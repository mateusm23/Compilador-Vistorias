import { useReport } from '../state/ReportContext.jsx';
import './Sidebar.css';

const STEPS = [
  { n: 1, label: 'Laudos PDF', isDone: (s) => s.pdfFiles.length > 0 },
  { n: 2, label: 'Mapa do empreendimento', isDone: (s) => s.detectedUnits.length > 0 },
  { n: 3, label: 'Dados do relatório', isDone: (s) => s.reportData.obra.trim().length > 0 },
  { n: 4, label: 'Capa', isDone: (s) => !!s.logoFile || !!s.capaPhotoFile },
  { n: 5, label: 'Introdução', isDone: (s) => !!s.introContent },
  { n: 6, label: 'Gerar relatório', isDone: () => false },
];

export default function Sidebar() {
  const { state, setStep } = useReport();

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon">🏗️</span>
        <span className="sidebar-brand-text">Extrator de Vistorias</span>
      </div>

      <ol className="sidebar-steps">
        {STEPS.map(step => {
          const active = state.step === step.n;
          const done = step.isDone(state);
          return (
            <li key={step.n}>
              <button
                className={`sidebar-step${active ? ' active' : ''}${done ? ' done' : ''}`}
                onClick={() => setStep(step.n)}
              >
                <span className="sidebar-step-num">{done ? '✓' : step.n}</span>
                <span className="sidebar-step-label">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="sidebar-footer">
        Processamento local no navegador. Nenhum arquivo é enviado a servidores.
      </div>
    </nav>
  );
}
