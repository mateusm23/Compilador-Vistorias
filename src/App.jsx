import { ReportProvider, useReport } from './state/ReportContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Step1Upload from './steps/Step1Upload.jsx';
import Step2Order from './steps/Step2Order.jsx';
import Step3Map from './steps/Step2Map.jsx';
import Step4ReportData from './steps/Step3ReportData.jsx';
import Step5Cover from './steps/Step4Cover.jsx';
import Step6Intro from './steps/Step5Intro.jsx';
import Step7Generate from './steps/Step6Generate.jsx';
import './App.css';

const STEP_COMPONENTS = {
  1: Step1Upload,
  2: Step2Order,
  3: Step3Map,
  4: Step4ReportData,
  5: Step5Cover,
  6: Step6Intro,
  7: Step7Generate,
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
