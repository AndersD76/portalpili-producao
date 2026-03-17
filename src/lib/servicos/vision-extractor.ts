import { AIExtractionResult } from './types';

const VISION_PROMPT = `Analise este comprovante/recibo/nota fiscal e extraia as informações.

Responda APENAS com JSON válido, sem texto adicional:

{
  "estabelecimento": "nome do local/estabelecimento",
  "valor_total": 0.00,
  "data": "DD/MM/AAAA",
  "hora": "HH:MM",
  "categoria_sugerida": "Almoço|Janta|Café|Lanche|Pernoite|Combustível|Estacionamento|Pedágio|Transporte|Peças|Material|Outros",
  "forma_pagamento": "Com dinheiro|Com cartão pessoal|Com cartão corporativo|null",
  "numero_nf": "número da NF/cupom fiscal ou null",
  "cidade": "cidade identificada ou null",
  "estado": "UF de 2 letras ou null",
  "combustivel_litros": null,
  "combustivel_tipo": null,
  "confiancas": {
    "estabelecimento": "alta|media|baixa",
    "valor_total": "alta|media|baixa",
    "data": "alta|media|baixa",
    "categoria_sugerida": "alta|media|baixa",
    "forma_pagamento": "alta|media|baixa",
    "numero_nf": "alta|media|baixa",
    "cidade": "alta|media|baixa"
  }
}

REGRAS DE CATEGORIZAÇÃO:
- Restaurante, lanchonete, pizzaria, padaria, bar com comida → "Almoço" ou "Janta" (pela hora se visível)
- Café, cafeteria, padaria (café) → "Café"
- Lanche, salgado, fast food → "Lanche"
- Posto de gasolina, combustível, Shell, Ipiranga, BR → "Combustível"
- Hotel, pousada, motel, Airbnb → "Pernoite"
- Uber, 99, táxi, passagem ônibus/avião → "Transporte"
- Estacionamento → "Estacionamento"
- Pedágio → "Pedágio"
- Loja de peças, ferragem → "Peças"
- Material, loja de materiais → "Material"
- Farmácia, outros → "Outros"

Se a forma de pagamento não for visível, retorne null.
Se o número da NF não for visível, retorne null.
Para campos que não consegue extrair, retorne null (nunca invente dados).`;

export async function extractReceiptData(
  imageBase64: string,
  mimeType: string
): Promise<{ success: true; data: AIExtractionResult; raw: unknown } | { success: false; error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'ANTHROPIC_API_KEY não configurada' };
  }

  // Remove data URI prefix if present
  const base64Data = imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64;

  // Validate base64 data is not empty/corrupt
  if (!base64Data || base64Data.length < 100) {
    return { success: false, error: 'Imagem inválida ou corrompida. Tente fotografar novamente.' };
  }

  // Normalize mime type
  const normalizedMime = mimeType.replace(/^image\/jpg$/, 'image/jpeg');
  const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!supportedTypes.includes(normalizedMime)) {
    return { success: false, error: `Formato de imagem não suportado (${mimeType}). Use JPEG, PNG ou WebP.` };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: normalizedMime,
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: VISION_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      console.error('Claude Vision API error:', response.status, errText);

      // Map common API errors to user-friendly messages
      if (response.status === 400) {
        if (errText.includes('Could not process image') || errText.includes('invalid_image')) {
          return { success: false, error: 'Não foi possível ler esta imagem. Tente uma foto mais nítida.' };
        }
        if (errText.includes('too large') || errText.includes('size')) {
          return { success: false, error: 'Imagem muito grande. Tente reduzir o tamanho ou tirar outra foto.' };
        }
        return { success: false, error: 'Imagem não pôde ser processada. Tente fotografar novamente.' };
      }
      if (response.status === 429) {
        return { success: false, error: 'Sistema ocupado. Aguarde um momento e tente novamente.' };
      }
      if (response.status >= 500) {
        return { success: false, error: 'Serviço de IA temporariamente indisponível. Preencha manualmente.' };
      }
      return { success: false, error: 'Erro ao analisar imagem. Preencha os campos manualmente.' };
    }

    let result;
    try {
      result = await response.json();
    } catch {
      return { success: false, error: 'Resposta inválida da IA. Preencha os campos manualmente.' };
    }

    const text = result.content?.[0]?.text?.trim() || '';

    if (!text) {
      return { success: false, error: 'A IA não conseguiu ler o comprovante. Preencha manualmente.' };
    }

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in Vision response:', text.substring(0, 200));
      return { success: false, error: 'Não foi possível extrair dados do comprovante. Preencha manualmente.' };
    }

    let dados: AIExtractionResult;
    try {
      dados = JSON.parse(jsonMatch[0]);
    } catch {
      console.error('Invalid JSON from Vision:', jsonMatch[0].substring(0, 200));
      return { success: false, error: 'Dados extraídos em formato inválido. Preencha manualmente.' };
    }

    return {
      success: true,
      data: dados,
      raw: result,
    };
  } catch (err) {
    console.error('Erro ao analisar comprovante:', err);
    // Network errors, timeouts, etc
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED')) {
      return { success: false, error: 'Sem conexão com o serviço de IA. Preencha manualmente.' };
    }
    if (msg.includes('timeout') || msg.includes('AbortError')) {
      return { success: false, error: 'Tempo esgotado ao analisar imagem. Preencha manualmente.' };
    }
    return { success: false, error: 'Erro ao processar imagem. Preencha os campos manualmente.' };
  }
}
