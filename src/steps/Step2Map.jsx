import StepShell from './StepShell.jsx';
import { useReport } from '../state/ReportContext.jsx';

export default function Step2Map() {
  const { state } = useReport();

  if (state.detectedUnits.length === 0) {
    return (
      <StepShell title="Mapa do empreendimento" description="Envie os laudos na etapa anterior para ver as unidades detectadas aqui.">
        <p className="empty-note">Nenhuma unidade detectada ainda.</p>
      </StepShell>
    );
  }

  const byPav = {};
  state.detectedUnits.forEach(u => {
    byPav[u.pav] = byPav[u.pav] || [];
    byPav[u.pav].push(u);
  });
  const pavimentos = Object.keys(byPav).map(Number).sort((a, b) => b - a);

  return (
    <StepShell
      title="Mapa do empreendimento"
      description="Unidades detectadas automaticamente pelos nomes dos arquivos. A grade visual completa, com categorias e cores personalizadas, chega na próxima etapa desta ferramenta."
    >
      <div className="map-preview-list">
        {pavimentos.map(pav => (
          <div key={pav} className="map-preview-row">
            <span className="map-preview-pav">Pav. {pav}</span>
            <span className="map-preview-units">
              {byPav[pav].map(u => u.code).join(' · ')}
            </span>
          </div>
        ))}
      </div>
      {state.naoReconhecidas.length > 0 && (
        <p className="empty-note">
          {state.naoReconhecidas.length} arquivo(s) com nome fora do padrão pavimento+lado não aparecem no mapa, mas seguem no relatório normalmente.
        </p>
      )}
    </StepShell>
  );
}
