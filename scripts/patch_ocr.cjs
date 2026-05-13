const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'components', 'driver', 'DriverProfileDialog.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldFn = `  const parseCnhOcrData = (text: string, currentForm: any) => {
    const updates: any = {};
    
    const cpfMatch = text.match(/\\b\\d{3}[\\.\\s]?\\d{3}[\\.\\s]?\\d{3}[-\\s]?\\d{2}\\b/);
    if (cpfMatch && !currentForm.cpf) updates.cpf = cpfMatch[0].replace(/[^\\d]/g, '');

    const dates = [...text.matchAll(/\\b(\\d{2})\\/(\\d{2})\\/(\\d{4})\\b/g)].map(m => ({ str: m[0], d: parseInt(m[1]), m: parseInt(m[2]), y: parseInt(m[3]) }));
    if (dates.length > 0) {
      dates.sort((a, b) => new Date(a.y, a.m - 1, a.d).getTime() - new Date(b.y, b.m - 1, b.d).getTime());
      const now = new Date().getTime();
      const futureDates = dates.filter(d => new Date(d.y, d.m - 1, d.d).getTime() > now);
      const pastDates = dates.filter(d => new Date(d.y, d.m - 1, d.d).getTime() <= now);
      
      if (futureDates.length > 0 && !currentForm.validade) updates.validade = futureDates[0].str;
      if (pastDates.length > 0) {
        if (!currentForm.data_nasc) updates.data_nasc = pastDates[0].str;
        if (pastDates.length > 1 && !currentForm.emissao_cnh) updates.emissao_cnh = pastDates[pastDates.length - 1].str;
        if (pastDates.length > 2 && !currentForm.primeira_habilitacao) updates.primeira_habilitacao = pastDates[1].str;
      }
    }

    const regMatch = text.match(/\\b\\d{11}\\b/);
    if (regMatch && !currentForm.n_registro_cnh) updates.n_registro_cnh = regMatch[0];

    const catMatch = text.match(/\\b(?:CAT.*?HAB|CATEGORIA|CAT\\.?)[^\\w]*([A-E]{1,2})\\b/i) || text.match(/\\b(AB|AC|AD|AE|A|B|C|D|E)\\b/);
    if (catMatch && !currentForm.categoria) updates.categoria = catMatch[1].toUpperCase();

    return { ...currentForm, ...updates, observacao: currentForm.observacao ? currentForm.observacao + '\\n\\n[OCR]: ' + text : '[OCR]: ' + text };
  };`;

const newFn = `  const parseCnhOcrData = (text: string, currentForm: any) => {
    const updates: any = {};
    const lines = text.split('\\n').map((l: string) => l.trim()).filter(Boolean);
    const norm = text.replace(/\\s+/g, ' ');

    // Helper: texto após rótulo (na mesma linha)
    const afterLabel = (...labels: string[]): string | null => {
      for (const lbl of labels) {
        const idx = norm.toUpperCase().indexOf(lbl.toUpperCase());
        if (idx === -1) continue;
        const after = norm.slice(idx + lbl.length).trimStart();
        const val = after.split(/\\n|;/)[0].trim();
        if (val.length > 1) return val;
      }
      return null;
    };

    // Helper: próxima linha após linha que contém o rótulo
    const lineAfter = (...labels: string[]): string | null => {
      for (const lbl of labels) {
        const idx = lines.findIndex((l: string) => l.toUpperCase().includes(lbl.toUpperCase()));
        if (idx !== -1 && lines[idx + 1]) return (lines[idx + 1] as string).trim();
      }
      return null;
    };

    // Helper: primeira data DD/MM/YYYY dentro da janela de texto após rótulo
    const dateNear = (...labels: string[]): string | null => {
      for (const lbl of labels) {
        const idx = norm.toUpperCase().indexOf(lbl.toUpperCase());
        if (idx === -1) continue;
        const win = norm.slice(idx, idx + 150);
        const m = win.match(/\\b(\\d{2})\\/(\\d{2})\\/(\\d{4})\\b/);
        if (m) return m[0];
      }
      return null;
    };

    // --- CPF: rótulo "CPF" → 000.000.000-00 ---
    if (!currentForm.cpf) {
      const raw = afterLabel('CPF') || '';
      const m = raw.match(/\\d{3}[.\\s]?\\d{3}[.\\s]?\\d{3}[-\\s]?\\d{2}/);
      if (m) updates.cpf = m[0].replace(/[^\\d]/g, '');
      else { const fb = text.match(/\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}/); if (fb) updates.cpf = fb[0].replace(/[^\\d]/g, ''); }
    }

    // --- Todas as datas para fallback ---
    const allDates = [...text.matchAll(/\\b(\\d{2})\\/(\\d{2})\\/(\\d{4})\\b/g)]
      .map((m: RegExpMatchArray) => ({ str: m[0], ts: new Date(+m[3], +m[2]-1, +m[1]).getTime() }))
      .filter((d: any) => d.ts > new Date(1940,0,1).getTime())
      .sort((a: any, b: any) => a.ts - b.ts);
    const now = Date.now();
    const past   = allDates.filter((d: any) => d.ts <= now);
    const future = allDates.filter((d: any) => d.ts >  now);

    // Validade: data futura | rótulo VALIDADE / VALID. / VENC.
    if (!currentForm.validade)
      updates.validade = dateNear('VALIDADE', 'VALID.', 'VENC.') || (future[0] as any)?.str || null;

    // Data Nascimento: data mais antiga | rótulo DATA DE NASCIMENTO / NASC.
    if (!currentForm.data_nasc)
      updates.data_nasc = dateNear('DATA DE NASCIMENTO', 'NASCIMENTO', 'NASC.', 'NASC ') || (past[0] as any)?.str || null;

    // 1ª Habilitação: rótulo 1ª HABILIT / PRIMEIRA HABIT
    if (!currentForm.primeira_habilitacao)
      updates.primeira_habilitacao = dateNear(
        '1ª HABILIT','1A HABILIT','1ÂªHABILIT','1° HABILIT',
        'PRIMEIRA HABIT','PRIM. HABIT','1a HABIT'
      ) || (past.length > 1 ? (past[1] as any).str : null);

    // Emissão: data passada mais recente | rótulo EMISSÃO / DATA DE EMISSÃO
    if (!currentForm.emissao_cnh)
      updates.emissao_cnh = dateNear('EMISSÃO','EMISSAO','DATA EMIS','DATA DE EMISS','LOCAL E DATA') ||
        (past.length > 0 ? (past[past.length-1] as any).str : null);

    // Nome da Mãe: linha após FILIAÇÃO / MÃE
    if (!currentForm.nome_mae) {
      const raw = lineAfter('FILIAÇÃO','FILIACAO','MÃE','MAE') || afterLabel('FILIAÇÃO:','MÃE:','FILIAÇAO:','MAE:');
      if (raw && raw.length > 3 && !/\\d{5}/.test(raw))
        updates.nome_mae = raw.replace(/[^a-zA-ZÀ-ú\\s]/g, '').trim();
    }

    // Nº Registro: 11 dígitos | rótulo Nº REGISTRO / REGISTRO
    if (!currentForm.n_registro_cnh) {
      const win = afterLabel('Nº REGISTRO','N° REGISTRO','N.° REGISTRO','REGISTRO') || '';
      const m = win.match(/\\b\\d{11}\\b/);
      if (m) { updates.n_registro_cnh = m[0]; }
      else {
        const cpfD = updates.cpf || currentForm.cpf || '';
        const fb = [...text.matchAll(/\\b(\\d{11})\\b/g)].map((x: RegExpMatchArray) => x[1]).find((n: string) => n !== cpfD);
        if (fb) updates.n_registro_cnh = fb;
      }
    }

    // Nº Formulário / Espelho: rótulo FORMULÁRIO / ESPELHO
    if (!currentForm.n_formulario_cnh) {
      const win = afterLabel('FORMULÁRIO','FORMULARIO','ESPELHO','FORM.') || '';
      const m = win.match(/\\b\\d{9,12}\\b/);
      if (m) updates.n_formulario_cnh = m[0];
    }

    // RENACH: UF (2 letras) + 9 dígitos | rótulo RENACH
    if (!currentForm.n_cnh_renach) {
      const win = afterLabel('RENACH','RENAC') || text;
      const m = win.match(/\\b([A-Z]{2}\\d{9})\\b/i);
      if (m) updates.n_cnh_renach = m[1].toUpperCase();
    }

    // Nº Segurança: 11 dígitos no verso | rótulo SEGURANÇA
    if (!currentForm.n_cnh_seguranca) {
      const win = afterLabel('SEGURANÇA','SEGURANCA','COD. SEG','N° SEG','NO. SEG') || '';
      const m = win.match(/\\b\\d{11}\\b/);
      if (m && m[0] !== (updates.n_registro_cnh || currentForm.n_registro_cnh))
        updates.n_cnh_seguranca = m[0];
    }

    // Categoria: A B C D E AB AC AD AE | rótulo CAT. HAB. / CATEGORIA
    if (!currentForm.categoria) {
      const win = afterLabel('CAT. HAB','CATEGORIA','CAT.','CATEG') || '';
      const m = win.match(/\\b(A[BCDE]?|[BCDE])\\b/i);
      if (m) updates.categoria = m[1].toUpperCase();
      else {
        const fb = norm.toUpperCase().match(/\\bCAT[^\\w]*([AE]{1,2}|[BCDE])\\b/);
        if (fb) updates.categoria = fb[1].toUpperCase();
      }
    }

    // Cidade de Emissão: rótulo LOCAL DE EMISSÃO / LOCALIDADE
    if (!currentForm.cidade_emissao) {
      const raw = lineAfter('LOCAL DE EMISSÃO','LOCALIDADE','LOCAL EMISS') || afterLabel('LOCAL:','CIDADE:');
      if (raw && raw.length > 2 && !/\\d{5}/.test(raw))
        updates.cidade_emissao = raw.replace(/[^a-zA-ZÀ-ú\\s]/g, '').trim().slice(0, 50);
    }

    return {
      ...currentForm,
      ...Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== null && v !== '')),
      observacao: currentForm.observacao
        ? currentForm.observacao + '\\n\\n[OCR]: ' + text
        : '[OCR]: ' + text,
    };
  };`;

if (!content.includes(oldFn)) {
  console.error('ERRO: função original não encontrada! Verifique o arquivo.');
  process.exit(1);
}

content = content.replace(oldFn, newFn);
fs.writeFileSync(file, content, 'utf8');
console.log('OK: parseCnhOcrData atualizada com sucesso!');
