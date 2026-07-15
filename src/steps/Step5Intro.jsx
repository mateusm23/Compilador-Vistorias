import StepShell from './StepShell.jsx';
import { useReport } from '../state/ReportContext.jsx';

export default function Step5Intro() {
  const { state, setIntroContent } = useReport();

  return (
    <StepShell
      title="Introdução"
      description="Texto de abertura do relatório, descrevendo o escopo do trabalho. Um editor com formatação completa (negrito, cor, tamanho, marcação) chega em breve nesta etapa."
    >
      <textarea
        className="intro-textarea"
        placeholder="Descreva o escopo do trabalho desenvolvido..."
        value={state.introContent || ''}
        onChange={(e) => setIntroContent(e.target.value)}
        rows={14}
      />
    </StepShell>
  );
}
