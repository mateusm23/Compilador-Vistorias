import { ReportProvider, useReport } from './state/ReportContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Step1Upload from './steps/Step1Upload.jsx';
import Step2Map from './steps/Step2Map.jsx';
import Step3ReportData from './steps/Step3ReportData.jsx';
import Step4Cover from './steps/Step4Cover.jsx';
import Step5Intro from './steps/Step5Intro.jsx';
import Step6Generate from './steps/Step6Generate.jsx';
import './App.css';

const STEP_COMPONENTS = {
  1: Step1Upload,
  2: Step2Map,
  3: Step3ReportData,
  4: Step4Cover,
  5: Step5Intro,
  6: Step6Generate,
};

function AppShell() {
  const { state } = useReport();
  const StepComponent = STEP_COMPONENTS[state.step] || Step1Upload;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <StepComponent />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ReportProvider>
      <AppShell />
    </ReportProvider>
  );
}
