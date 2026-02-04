// Script para gerar ícones PWA em múltiplos tamanhos
// Execute: node scripts/generate-pwa-icons.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#dc2626"/>
  <text x="256" y="280" font-family="Arial, sans-serif" font-size="180" font-weight="bold" fill="white" text-anchor="middle">SIG</text>
  <text x="256" y="380" font-family="Arial, sans-serif" font-size="60" fill="white" text-anchor="middle" opacity="0.9">PILI</text>
</svg>`;

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Garantir que o diretório existe
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateIcons() {
  console.log('Gerando ícones PWA...');

  const svgBuffer = Buffer.from(svgContent);

  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✅ Criado: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Erro ao criar icon-${size}x${size}.png:`, error.message);
    }
  }

  console.log('\nÍcones gerados com sucesso!');
}

generateIcons().catch(console.error);
