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

// Valid mime types for Claude Vision API
const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

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

  // Normalize mime type - default to image/jpeg if invalid
  let normalizedMime = mimeType.toLowerCase().split(';')[0].trim();
  if (!VALID_MIME_TYPES.includes(normalizedMime)) {
    normalizedMime = 'image/jpeg';
  }

  // Use Haiku for fast, cheap receipt extraction
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
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
      const errText = await response.text();
      console.error(`[Vision] API error ${response.status} (model=${model}, mime=${normalizedMime}):`, errText);
      return { success: false, error: `Erro na API de visão: ${response.status} - ${errText.substring(0, 200)}` };
    }

    const result = await response.json();
    const text = result.content?.[0]?.text?.trim() || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Vision] No JSON in response:', text.substring(0, 300));
      return { success: false, error: 'Não foi possível extrair dados do comprovante' };
    }

    const dados: AIExtractionResult = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      data: dados,
      raw: result,
    };
  } catch (err) {
    console.error('[Vision] Erro ao analisar comprovante:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao analisar comprovante',
    };
  }
}
