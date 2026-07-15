import StepShell from './StepShell.jsx';
import RichTextEditor from '../components/RichTextEditor.jsx';
import { useReport } from '../state/ReportContext.jsx';

export default function Step5Intro() {
  const { state, setIntroContent } = useReport();

  return (
    <StepShell
      title="Introdução"
      description="Texto de abertura do relatório, descrevendo o escopo do trabalho. Formate como quiser: negrito, cor, tamanho, marcação e alinhamento."
    >
      <RichTextEditor content={state.introContent} onChange={setIntroContent} />
    </StepShell>
  );
}
