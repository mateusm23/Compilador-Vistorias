import StepShell from './StepShell.jsx';
import { useReport } from '../state/ReportContext.jsx';

const FIELDS = [
  { key: 'obra', label: 'Nome da obra' },
  { key: 'responsavel', label: 'Engenheiro responsável' },
  { key: 'construtora', label: 'Construtora' },
  { key: 'gerenciadora', label: 'Gerenciadora' },
  { key: 'dataInicio', label: 'Data de início', type: 'date' },
  { key: 'dataFim', label: 'Data de encerramento', type: 'date' },
];

export default function Step3ReportData() {
  const { state, setReportData } = useReport();

  return (
    <StepShell title="Dados do relatório" description="Essas informações aparecem na capa do PDF gerado.">
      <div className="form-grid">
        {FIELDS.map(f => (
          <label key={f.key} className="form-field">
            <span>{f.label}</span>
            <input
              type={f.type || 'text'}
              value={state.reportData[f.key]}
              onChange={(e) => setReportData({ [f.key]: e.target.value })}
            />
          </label>
        ))}
      </div>
    </StepShell>
  );
}
