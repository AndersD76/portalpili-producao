// Script para gerar um som de notificação simples (WAV)
// Execute: node scripts/generate-notification-sound.js

const fs = require('fs');
const path = require('path');

// Parâmetros do áudio
const sampleRate = 44100;
const duration = 0.3; // 300ms
const frequency = 880; // Nota A5

// Gerar samples de onda senoidal
const numSamples = Math.floor(sampleRate * duration);
const samples = new Int16Array(numSamples);

for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  // Envelope para fade in/out suave
  const envelope = Math.min(1, Math.min(t * 20, (duration - t) * 20));
  // Onda senoidal
  const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.5;
  samples[i] = Math.floor(sample * 32767);
}

// Criar header WAV
function createWavHeader(dataLength) {
  const buffer = Buffer.alloc(44);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24); // sample rate
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

// Converter samples para buffer
const dataBuffer = Buffer.from(samples.buffer);

// Criar arquivo WAV
const wavHeader = createWavHeader(dataBuffer.length);
const wavFile = Buffer.concat([wavHeader, dataBuffer]);

// Salvar arquivo
const outputPath = path.join(__dirname, '..', 'public', 'sounds', 'notification.wav');
fs.writeFileSync(outputPath, wavFile);

console.log(`✅ Som de notificação criado: ${outputPath}`);
console.log(`   Duração: ${duration}s`);
console.log(`   Frequência: ${frequency}Hz`);
console.log(`   Sample Rate: ${sampleRate}Hz`);
