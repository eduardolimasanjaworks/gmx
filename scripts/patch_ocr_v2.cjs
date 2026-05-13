const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'components', 'driver', 'DriverProfileDialog.tsx');
let content = fs.readFileSync(file, 'utf8');

const newFn = `  const parseCnhOcrData = (text: string, currentForm: any) => {
    const updates: any = {};
    
    // Normaliza o texto quebrando por espaços e removendo ruídos extras
    const norm = text.replace(/\\s+/g, ' ').toUpperCase();

    // ── EXTRAÇÃO DE DATAS ───────────────────────────────────────────
    // Regex flexível que aceita DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY com ou sem espaços
    const dateRegex = /\\b(\\d{2})\\s*[\\/.-]\\s*(\\d{2})\\s*[\\/.-]\\s*(\\d{4})\\b/g;
    const allDates = [];
    let match;
    while ((match = dateRegex.exec(text)) !== null) {
      const d = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const y = parseInt(match[3], 10);
      const ts = new Date(y, m - 1, d).getTime();
      
      // Filtra datas absurdas (antes de 1940 ou depois de 2100)
      if (ts > new Date(1940, 0, 1).getTime() && ts < new Date(2100, 0, 1).getTime()) {
        const formatted = \`\${match[1]}/\${match[2]}/\${match[3]}\`;
        allDates.push({ str: formatted, ts });
      }
    }

    // Remove datas duplicadas (mesmo timestamp)
    const uniqueDates = Array.from(new Map(allDates.map(item => [item.ts, item])).values());
    uniqueDates.sort((a, b) => a.ts - b.ts);

    const now = Date.now();
    const past = uniqueDates.filter(d => d.ts <= now);
    const future = uniqueDates.filter(d => d.ts > now);

    // ESTRATÉGIA DE DATAS POR ORDEM CRONOLÓGICA
    // Numa CNH padrão temos: Nascimento < 1ª Habilitação < Emissão <= Hoje < Validade
    
    if (!currentForm.validade && future.length > 0) {
      updates.validade = future[future.length - 1].str; // A data mais no futuro
    }

    if (past.length >= 3) {
      if (!currentForm.data_nasc) updates.data_nasc = past[0].str; // Mais antiga = Nascimento
      if (!currentForm.primeira_habilitacao) updates.primeira_habilitacao = past[1].str; // Meio = 1ª Hab
      if (!currentForm.emissao_cnh) updates.emissao_cnh = past[past.length - 1].str; // Mais recente passada = Emissão
    } else if (past.length === 2) {
      // Se só achou 2 passadas, assume que a mais antiga é Nasc e a mais nova é Emissão
      if (!currentForm.data_nasc) updates.data_nasc = past[0].str;
      if (!currentForm.emissao_cnh) updates.emissao_cnh = past[1].str;
    } else if (past.length === 1) {
      // Se só achou 1 passada, provavelmente é a Emissão ou Nascimento (chutamos Emissão por segurança)
      if (!currentForm.emissao_cnh) updates.emissao_cnh = past[0].str;
    }

    // ── CPF ─────────────────────────────────────────────────────────
    if (!currentForm.cpf) {
      // Procura formato padrão ou quebrado por OCR
      const cpfMatch = norm.match(/\\d{3}[\\.\\s]?\\d{3}[\\.\\s]?\\d{3}[-\\s]?\\d{2}/);
      if (cpfMatch) {
        updates.cpf = cpfMatch[0].replace(/[^\\d]/g, '');
      }
    }

    // ── CATEGORIA ───────────────────────────────────────────────────
    if (!currentForm.categoria) {
      // Categorias válidas isoladas ou precedidas de ruído
      const catMatch = norm.match(/\\b(A|B|C|D|E|AB|AC|AD|AE)\\b/);
      if (catMatch) {
        updates.categoria = catMatch[1];
      }
    }

    // ── Nº REGISTRO CNH (11 dígitos) ───────────────────────────────
    if (!currentForm.n_registro_cnh) {
      const cpfDigits = updates.cpf || currentForm.cpf || '';
      // Encontra qualquer sequência de 11 números que não seja o CPF
      const regMatches = [...norm.matchAll(/\\b(\\d{11})\\b/g)].map(x => x[1]);
      const registro = regMatches.find(n => n !== cpfDigits);
      if (registro) updates.n_registro_cnh = registro;
    }
    
    // ── Nº FORMULÁRIO / ESPELHO (9 a 12 dígitos) ───────────────────
    if (!currentForm.n_formulario_cnh) {
      // Frequentemente tem 9 ou 10 dígitos e começa com número específico, vamos pegar 9+ dígitos soltos
      const formMatches = [...norm.matchAll(/\\b(\\d{9,12})\\b/g)].map(x => x[1]);
      const cpfDigits = updates.cpf || currentForm.cpf || '';
      const regDigits = updates.n_registro_cnh || currentForm.n_registro_cnh || '';
      const formulario = formMatches.find(n => n !== cpfDigits && n !== regDigits);
      if (formulario) updates.n_formulario_cnh = formulario;
    }

    // ── RENACH (UF + 9 dígitos) ─────────────────────────────────────
    if (!currentForm.n_cnh_renach) {
      const renachMatch = norm.match(/\\b([A-Z]{2}\\d{9})\\b/);
      if (renachMatch) updates.n_cnh_renach = renachMatch[1];
    }

    return {
      ...currentForm,
      ...Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== null && v !== '')),
      observacao: currentForm.observacao
        ? currentForm.observacao + '\\n\\n[OCR]: ' + text
        : '[OCR]: ' + text,
    };
  };`;

// We'll replace the existing function block using substring.
const startMarker = "  const parseCnhOcrData = (text: string, currentForm: any) => {";
const endMarker = "  };\\n\\n  const uploadPublicAndGetUrl = async";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found");
  process.exit(1);
}

const before = content.slice(0, startIndex);
const after = content.slice(endIndex + "  };".length);

content = before + newFn + after;
fs.writeFileSync(file, content, 'utf8');
console.log("OK: Updated parseCnhOcrData successfully.");
