/**
 * Script to update handleChange in ALL CQ form components
 * to save _usuario and _data per check item when a _status field is changed.
 *
 * Only updates files that have getUsuario() but DON'T already have _usuario tracking in handleChange.
 */
const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '..', 'src', 'components');

// Files to update (have getUsuario but no per-item tracking)
const filesToUpdate = [
  'FormularioCorte.tsx',
  'FormularioMontagem.tsx',
  'FormularioControleQualidadeCentral.tsx',
  'FormularioControleQualidadeSolda.tsx',
  'FormularioControleQualidadeSoldaLado2.tsx',
  'FormularioPintura.tsx',
  'FormularioBracos.tsx',
  'FormularioPedestais.tsx',
  'FormularioSobPlataforma.tsx',
  'FormularioPainelEletrico.tsx',
  'FormularioCaixaTravaChassi.tsx',
  'FormularioTravadorRodas.tsx',
  'FormularioCavaleteTravaChassi.tsx',
  'FormularioRampas.tsx',
  'FormularioTravaChassi.tsx',
  'FormularioMontagemSoldaInferior.tsx',
  'FormularioSoldaInferior.tsx',
  'FormularioCentralSubconjuntos.tsx',
  'FormularioMontagemEletricaHidraulica.tsx',
  'FormularioMontagemCalhas.tsx',
  'FormularioMontagemHidraulicaSobPlataforma.tsx',
  'FormularioExpedicao.tsx',
  'FormularioColetorCiclone.tsx',
  'FormularioColetorPintura.tsx',
  'FormularioColetorMontagemInicial.tsx',
  'FormularioColetorCentralHidraulica.tsx',
  'FormularioColetorTuboColeta.tsx',
  'FormularioColetorColunaInferior.tsx',
  'FormularioColetorColunaSuperior.tsx',
  'FormularioColetorEscadaPlatibanda.tsx',
];

// Two variants of the simple handleChange pattern
const simplePatterns = [
  // Variant 1: HTMLInputElement | HTMLSelectElement (no HTMLTextAreaElement)
  `  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };`,
  // Variant 2: includes HTMLTextAreaElement
  `  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };`,
];

function makeReplacement(typeSignature) {
  return `  const handleChange = (e: React.ChangeEvent<${typeSignature}>) => {
    const { name, value } = e.target;
    // Ao preencher um campo _status, registrar qual usuario fez e quando
    if (name.endsWith('_status') && value) {
      const base = name.replace('_status', '');
      setFormData(prev => ({
        ...prev,
        [name]: value,
        [\`\${base}_usuario\`]: getUsuario(),
        [\`\${base}_data\`]: new Date().toISOString(),
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };`;
}

let updated = 0;
let skipped = 0;
let errors = 0;

for (const filename of filesToUpdate) {
  const filepath = path.join(componentsDir, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`SKIP (not found): ${filename}`);
    skipped++;
    continue;
  }

  let content = fs.readFileSync(filepath, 'utf8');

  // Check if already has _usuario tracking in handleChange
  if (content.includes('_usuario`) : getUsuario()') || content.includes('_usuario`]: getUsuario()')) {
    console.log(`SKIP (already has tracking): ${filename}`);
    skipped++;
    continue;
  }

  let replaced = false;

  // Try variant 1 (without HTMLTextAreaElement)
  if (content.includes(simplePatterns[0])) {
    content = content.replace(simplePatterns[0], makeReplacement('HTMLInputElement | HTMLSelectElement'));
    replaced = true;
  }
  // Try variant 2 (with HTMLTextAreaElement)
  else if (content.includes(simplePatterns[1])) {
    content = content.replace(simplePatterns[1], makeReplacement('HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement'));
    replaced = true;
  }

  if (replaced) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`UPDATED: ${filename}`);
    updated++;
  } else {
    console.log(`ERROR (pattern not found): ${filename}`);
    errors++;
  }
}

console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
