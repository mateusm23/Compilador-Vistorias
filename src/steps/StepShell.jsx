export default function StepShell({ title, description, children }) {
  return (
    <div className="step">
      <div className="step-head">
        <h1>{title}</h1>
        {description && <p className="step-description">{description}</p>}
      </div>
      <div className="step-body">{children}</div>
    </div>
  );
}
