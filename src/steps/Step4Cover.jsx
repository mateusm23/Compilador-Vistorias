import { useRef } from 'react';
import StepShell from './StepShell.jsx';
import { useReport } from '../state/ReportContext.jsx';

export default function Step4Cover() {
  const { state, setLogo, setCapaPhoto } = useReport();
  const logoInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const onLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogo(file, URL.createObjectURL(file));
  };

  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapaPhoto(file, URL.createObjectURL(file));
  };

  return (
    <StepShell title="Capa" description="Logo da empresa e foto da obra usados na capa e no cabeçalho das páginas.">
      <div className="cover-upload-grid">
        <div className="cover-upload-box" onClick={() => logoInputRef.current?.click()}>
          {state.logoUrl ? (
            <img src={state.logoUrl} alt="Logo" className="cover-upload-preview" />
          ) : (
            <span className="cover-upload-placeholder">Clique para enviar o logo</span>
          )}
          <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onLogoChange} />
        </div>

        <div className="cover-upload-box" onClick={() => photoInputRef.current?.click()}>
          {state.capaPhotoUrl ? (
            <img src={state.capaPhotoUrl} alt="Foto da obra" className="cover-upload-preview" />
          ) : (
            <span className="cover-upload-placeholder">Clique para enviar a foto da obra</span>
          )}
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhotoChange} />
        </div>
      </div>
    </StepShell>
  );
}
