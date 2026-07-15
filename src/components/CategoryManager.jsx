import { useState } from 'react';
import { useReport } from '../state/ReportContext.jsx';
import './CategoryManager.css';

export default function CategoryManager() {
  const { state, addCategory, removeCategory } = useReport();
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#C05621');

  const submit = (e) => {
    e.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed) return;
    addCategory({ nome: trimmed, cor: cor.replace('#', '').toUpperCase() });
    setNome('');
  };

  return (
    <div className="category-manager">
      <div className="category-list">
        {state.categories.map(cat => (
          <div key={cat.id} className="category-chip">
            <span className="category-swatch" style={{ background: `#${cat.cor}` }} />
            <span>{cat.nome}</span>
            {!cat.padrao && (
              <button type="button" className="category-remove" onClick={() => removeCategory(cat.id)}>×</button>
            )}
          </div>
        ))}
      </div>

      <form className="category-add-form" onSubmit={submit}>
        <input
          type="text"
          placeholder="Nova categoria (ex: Não Liberado)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          type="color"
          value={cor}
          onChange={(e) => setCor(e.target.value)}
          title="Cor da categoria"
        />
        <button type="submit" className="category-add-btn">Adicionar</button>
      </form>
    </div>
  );
}
