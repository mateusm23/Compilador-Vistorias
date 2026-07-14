const CATEGORY_RULES = [
  { cat: 'Registro Fotográfico (sem patologia)', re: /^foto (geral|da|do)|^entrada\.?$/i },
  { cat: 'Estrutural / Fissuras e Trincas', re: /fissur|trinca/i },
  { cat: 'Infiltração / Umidade / Vazamento', re: /infiltra|umidade|vazamento/i },
  { cat: 'Pintura / Acabamento de Parede', re: /pintura|textura/i },
  { cat: 'Piso (caimento, som cavo, manchas)', re: /piso|caimento|filete|rodapé/i },
  { cat: 'Revestimento Cerâmico / Rejunte', re: /revestimento|rejunte/i },
  { cat: 'Esquadrias (Portas, Janelas, Vidros)', re: /porta|janela|alisar|portal|perfil|maçaneta|fechadura|veneziana|vidro|folha|batente|dobradiça|trava|esquadr/i },
  { cat: 'Metais, Louças e Hidráulica', re: /cuba|sifão|torneira|engate|caixa acoplada|vaso|bacia|ralo|grelha|lavatório|bancada|hidráulic|tanque/i },
  { cat: 'Instalações Elétricas', re: /iluminação|qdc|disjuntor|circuito|interruptor|tomada|interfone|elétric|quadro de distribuição/i },
  { cat: 'Serralheria / Guarda-corpo / Oxidação', re: /guarda[- ]corpo|oxidação|mão francesa|serralheria/i },
  { cat: 'Pendência de Execução/Instalação', re: /pendente|finalizar|terminalidade|ausência das chaves/i },
  { cat: 'Alvenaria / Requadração / Acabamento Geral', re: /requadr|granito|polimento|alinhamento|alinhado/i },
  { cat: 'Limpeza / Manchas de Sujeira', re: /sujeira|sujidade/i },
];

export function classify(desc) {
  for (const r of CATEGORY_RULES) {
    if (r.re.test(desc)) return r.cat;
  }
  return 'Outros';
}

export function parseItems(text, unidade, arquivo) {
  const items = [];
  const re = /Grupo:\s*([^\n]+)\n([\s\S]*?)\((\d+)\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const grupo = m[1].trim();
    const desc = m[2].replace(/\n+/g, ' ').trim();
    const fotoNum = m[3];
    if (!desc) continue;
    items.push({ unidade, ambiente: grupo, descricao: desc, fotoNum, arquivo });
  }
  return items;
}
