import { useState, useMemo, useRef, useEffect } from 'react';
import { buildUnitCode } from '../lib/units.js';
import { useReport } from '../state/ReportContext.jsx';
import './BuildingGrid.css';

export default function BuildingGrid() {
  const { state, setUnitCategory } = useReport();
  const { buildingConfig, detectedUnits, categories, unitCategoryOverrides } = state;
  const [openCell, setOpenCell] = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenCell(null);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const detectedByCode = useMemo(() => {
    const map = {};
    detectedUnits.forEach(u => { map[u.code] = u; });
    return map;
  }, [detectedUnits]);

  const categoryById = useMemo(() => {
    const map = {};
    categories.forEach(c => { map[c.id] = c; });
    return map;
  }, [categories]);

  if (!buildingConfig) return null;

  const { pavMin, pavMax, numMin, numMax, lados } = buildingConfig;
  const pavimentos = [];
  for (let p = pavMax; p >= pavMin; p--) pavimentos.push(p);
  const nums = [];
  for (let n = numMin; n <= numMax; n++) nums.push(n);

  return (
    <div className="building-grid" ref={wrapRef}>
      <div className="building-grid-header" style={{ gridTemplateColumns: `48px repeat(${lados.length * nums.length}, 1fr)` }}>
        <span />
        {lados.map(lado => (
          <span key={lado} className="building-grid-lado-label" style={{ gridColumn: `span ${nums.length}` }}>
            Bloco {lado}
          </span>
        ))}
      </div>

      {pavimentos.map(pav => (
        <div
          key={pav}
          className="building-grid-row"
          style={{ gridTemplateColumns: `48px repeat(${lados.length * nums.length}, 1fr)` }}
        >
          <span className="building-grid-pav-label">{pav}</span>
          {lados.map(lado => nums.map(num => {
            const code = buildUnitCode(pav, num, lado);
            const detected = detectedByCode[code];
            const overrideId = unitCategoryOverrides[code];
            const categoryId = overrideId || (detected ? 'vistoriada' : null);
            const category = categoryId ? categoryById[categoryId] : null;
            const isOpen = openCell === code;

            return (
              <div key={code} className="building-grid-cell-wrap">
                <button
                  type="button"
                  className={`building-grid-cell${category ? '' : ' empty'}`}
                  style={category ? { background: `#${category.cor}`, color: '#fff' } : undefined}
                  onClick={() => setOpenCell(isOpen ? null : code)}
                  title={code}
                >
                  {code}
                </button>
                {isOpen && (
                  <div className="building-grid-popover">
                    <button type="button" onClick={() => { setUnitCategory(code, null); setOpenCell(null); }}>
                      {detected ? 'Vistoriada (padrão)' : 'Nenhuma categoria'}
                    </button>
                    {categories.filter(c => !c.padrao).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setUnitCategory(code, c.id); setOpenCell(null); }}
                      >
                        <span className="category-swatch" style={{ background: `#${c.cor}` }} />
                        {c.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }))}
        </div>
      ))}
    </div>
  );
}
