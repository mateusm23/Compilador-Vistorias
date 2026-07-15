import StepShell from './StepShell.jsx';
import CategoryManager from '../components/CategoryManager.jsx';
import BuildingGrid from '../components/BuildingGrid.jsx';
import { useReport } from '../state/ReportContext.jsx';

function NumberField({ label, value, onChange }) {
  return (
    <label className="form-field small">
      <span>{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export default function Step2Map() {
  const { state, setBuildingConfig } = useReport();

  if (!state.buildingConfig) {
    return (
      <StepShell title="Mapa do empreendimento" description="Envie os laudos na etapa anterior para ver as unidades detectadas aqui.">
        <p className="empty-note">Nenhuma unidade detectada ainda.</p>
      </StepShell>
    );
  }

  const { pavMin, pavMax, numMin, numMax, lados } = state.buildingConfig;

  const toggleLado = (letra) => {
    const next = lados.includes(letra) ? lados.filter(l => l !== letra) : [...lados, letra].sort();
    setBuildingConfig({ lados: next });
  };

  return (
    <StepShell
      title="Mapa do empreendimento"
      description="Ajuste a estrutura do prédio se necessário e clique em qualquer unidade para atribuir uma categoria. Unidades com laudo enviado já aparecem como Vistoriada."
    >
      <div className="map-config-row">
        <NumberField label="Pavimento inicial" value={pavMin} onChange={(v) => setBuildingConfig({ pavMin: v })} />
        <NumberField label="Pavimento final" value={pavMax} onChange={(v) => setBuildingConfig({ pavMax: v })} />
        <NumberField label="Unidade inicial" value={numMin} onChange={(v) => setBuildingConfig({ numMin: v })} />
        <NumberField label="Unidade final" value={numMax} onChange={(v) => setBuildingConfig({ numMax: v })} />
      </div>

      <div className="map-blocos-row">
        <span className="map-blocos-label">Blocos:</span>
        {['A', 'B', 'C', 'D', 'E'].map(letra => (
          <button
            key={letra}
            type="button"
            className={`bloco-toggle${lados.includes(letra) ? ' active' : ''}`}
            onClick={() => toggleLado(letra)}
          >
            {letra}
          </button>
        ))}
      </div>

      <div className="map-section-title">Categorias</div>
      <CategoryManager />

      <div className="map-section-title">Unidades</div>
      <BuildingGrid />

      {state.naoReconhecidas.length > 0 && (
        <p className="empty-note">
          {state.naoReconhecidas.length} arquivo(s) com nome fora do padrão pavimento e bloco não aparecem no mapa, mas seguem no relatório normalmente.
        </p>
      )}
    </StepShell>
  );
}
