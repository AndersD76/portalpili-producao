'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================
// Tutorial data
// ============================================

interface TutorialSlide {
  title: string;
  bullets: string[];
  narration: string;
  imagePlaceholder?: string;
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  icon: string;
  slides: TutorialSlide[];
}

const TUTORIALS: Tutorial[] = [
  {
    id: 'acesso',
    title: 'Acesso e Login',
    description: 'Como acessar o Portal Pili e fazer seu primeiro login',
    icon: '🔑',
    slides: [
      {
        title: 'Bem-vindo ao Portal Pili',
        bullets: [
          'O Portal Pili e a ferramenta central da empresa',
          'Acesse pelo navegador Google Chrome',
          'Funciona no computador, tablet e celular',
          '5 modulos: Producao, Qualidade, Comercial, Servicos e Chao de Fabrica',
        ],
        narration: 'Bem-vindo ao Portal Pili! Neste tutorial, voce vai aprender como acessar o sistema, fazer login e navegar pelos modulos disponiveis. O Portal Pili e a ferramenta central da empresa para gestao de producao, qualidade, comercial e servicos. Voce pode acessar de qualquer navegador, no computador ou no celular.',
      },
      {
        title: 'Abrindo o Portal',
        bullets: [
          'Abra o Google Chrome no computador ou celular',
          'Digite o endereco fornecido pela TI na barra de endereco',
          'A tela de boas-vindas aparece com o logo do Portal Pili',
          'Clique no botao vermelho "ACESSAR"',
        ],
        narration: 'O primeiro passo e abrir o navegador e digitar o endereco do Portal Pili. Recomendamos o Google Chrome. Ao carregar, voce vera a tela inicial com o logo. Clique no botao vermelho Acessar para ir para a tela de login.',
      },
      {
        title: 'Fazendo Login',
        bullets: [
          'No campo "ID do Usuario", digite seu numero de identificacao',
          'No campo "Senha", digite a senha fornecida pelo administrador',
          'Clique em "Entrar" para acessar',
          'Se tiver dificuldades, procure o setor de TI',
        ],
        narration: 'Na tela de login, preencha o campo I D com seu numero de identificacao de funcionario. Em seguida, digite sua senha. Se for seu primeiro acesso, a senha padrao sera informada pelo administrador. Clique em Entrar. Se as credenciais estiverem corretas, voce sera direcionado para a pagina inicial.',
      },
      {
        title: 'Pagina Inicial',
        bullets: [
          'Cada card vermelho representa um modulo do sistema',
          'Producao: controle de OPDs em tempo real',
          'Qualidade: gestao de NCs, reclamacoes e acoes corretivas',
          'Comercial: CRM, pipeline de vendas e propostas',
          'Servicos: despesas de campo e gestao de servicos',
          'Seu nome aparece no canto superior direito',
        ],
        narration: 'Apos o login, voce vera a pagina inicial com os modulos disponiveis. Clique no modulo desejado para acessar suas funcionalidades. Os modulos visiveis dependem das suas permissoes. Seu nome aparece no canto superior direito, confirmando que esta logado.',
      },
      {
        title: 'Dicas Importantes',
        bullets: [
          'Adicione o portal aos favoritos do navegador',
          'No celular, instale como app: "Adicionar a tela inicial"',
          'Nunca compartilhe sua senha com terceiros',
          'Em caso de problemas, procure o setor de TI',
        ],
        narration: 'Algumas dicas: adicione o endereco do portal aos favoritos para facilitar o acesso. No celular, voce pode instalar como aplicativo usando a opcao Adicionar a tela inicial do navegador. Lembre-se de nunca compartilhar sua senha. Em caso de problemas, procure o setor de T I. Bom trabalho!',
      },
    ],
  },
  {
    id: 'producao',
    title: 'Modulo Producao',
    description: 'Gestao de OPDs, atividades, formularios e relatorios',
    icon: '🏭',
    slides: [
      {
        title: 'Modulo de Producao',
        bullets: [
          'Controle completo de Ordens de Producao',
          '22 etapas por OPD com timer individual',
          'Formularios de controle de qualidade integrados',
          'Chat por OPD para comunicacao da equipe',
          'Dashboard e calendario de entregas',
        ],
        narration: 'Neste tutorial, vamos conhecer o Modulo de Producao do Portal Pili. Aqui voce gerencia Ordens de Producao, acompanha atividades, preenche formularios de controle de qualidade, usa o chat da OPD, gera relatorios e muito mais.',
      },
      {
        title: 'Lista de OPDs',
        bullets: [
          'Clique no card "Producao" na pagina inicial',
          'Veja todas as OPDs em formato de cards',
          'Filtros: Todas, Atrasadas, Hoje, 3 dias, 7 dias, 30 dias',
          'Cada card mostra numero, tipo, responsavel e progresso',
          'Botao "+ Nova OPD" para criar uma nova ordem',
        ],
        narration: 'Ao acessar o modulo, voce ve a lista de todas as OPDs. Cada card mostra o numero, tipo de produto, responsavel, datas e uma barra de progresso. Use os filtros no topo para encontrar OPDs especificas. As cores indicam o status: vermelho para iniciadas, amarelo para quase prontas.',
      },
      {
        title: 'Detalhe da OPD',
        bullets: [
          'Clique em "Ver Detalhes" para abrir uma OPD',
          'Cabecalho com numero, tipo, datas e progresso',
          '4 indicadores: Total, Concluidas, Em Andamento, A Realizar',
          'Botoes: Post-it, Relatorio, Editar e Deletar',
          'Lista de 22 atividades com status individual',
        ],
        narration: 'Ao abrir uma OPD, voce ve o cabecalho com todas as informacoes. Os quatro cards coloridos mostram o resumo das atividades. Logo abaixo, a lista completa de atividades com status, responsavel, tempo acumulado e previsao de cada etapa.',
      },
      {
        title: 'Atividades e Timer',
        bullets: [
          'Cada atividade tem status visual por cores',
          'Verde: concluida. Amarelo: em andamento. Vermelho: pausada',
          'Timer conta o tempo acumulado de trabalho',
          'Clique na atividade para expandir e ver detalhes',
          'Botoes de Formulario e Editar em cada atividade',
        ],
        narration: 'Cada atividade possui status visual, responsavel e timer. O timer conta o tempo real de trabalho. Ao clicar em uma atividade, ela se expande mostrando datas, historico de acoes e botoes de formulario e edicao.',
      },
      {
        title: 'Chat da OPD',
        bullets: [
          'Painel lateral direito em cada OPD',
          'Envie mensagens para toda a equipe da OPD',
          'Mensagens ficam salvas permanentemente',
          'Serve como historico de comunicacao',
          'Notificacoes para novos mensagens',
        ],
        narration: 'O Chat da OPD fica ao lado direito da tela. Toda a equipe pode trocar mensagens sobre aquela ordem especifica. As mensagens ficam salvas permanentemente e servem como historico de comunicacao. Use o chat para registrar decisoes, problemas e atualizacoes.',
      },
      {
        title: 'Formularios de Qualidade',
        bullets: [
          'Cada etapa pode ter um formulario de CQ vinculado',
          'Checklists com campos Sim/Nao para liberacoes',
          'Formularios tecnicos com criterios, medidas e tolerancias',
          'Salve como rascunho ou finalize o controle',
          'Formularios de producao: Corte, Solda, Montagem, etc.',
        ],
        narration: 'Os formularios de controle de qualidade estao integrados nas atividades. A Liberacao Comercial tem um checklist simples, enquanto etapas como Corte possuem criterios tecnicos detalhados. Voce pode salvar como rascunho ou finalizar o controle.',
      },
      {
        title: 'Subtarefas de Producao',
        bullets: [
          'A etapa "Producao" tem diversas subtarefas',
          'A: Corte, B: Montagem Superior, C: Central Hidraulica',
          'D: Solda Lado 01, E: Solda Lado 02, F: Solda Inferior',
          'Cada subtarefa tem timer e formulario proprios',
          'Acompanhe o progresso de cada processo fabril',
        ],
        narration: 'Dentro da atividade Producao existem subtarefas para cada etapa fabril. Cada uma pode ser iniciada, pausada e concluida individualmente, com timer e formulario proprios. O status visual por cores permite acompanhar rapidamente o progresso.',
      },
      {
        title: 'Post-its e Relatorios',
        bullets: [
          'Post-its: registre pendencias com responsavel e prazo',
          'Relatorio: visao completa da OPD para impressao',
          'Filtros: Timeline, Formularios, Chat, Post-its, NCs',
          'Exporte como PDF pela impressao do navegador',
          'Editar e Deletar OPDs pelo cabecalho',
        ],
        narration: 'Os post-its permitem registrar pendencias com responsavel e prazo. O relatorio compila todas as informacoes para impressao ou exportacao em P D F. Voce tambem pode editar os dados da OPD ou excluir pelo cabecalho.',
      },
      {
        title: 'Dashboard e Calendario',
        bullets: [
          'Dashboard: Total OPDs, Atividades, Em 7 dias, Atrasadas',
          'Distribuicao de status em grafico',
          'OPDs em andamento com percentual',
          'Calendario: entregas organizadas por data',
          'Navegacao mes a mes com destaques',
        ],
        narration: 'O Dashboard mostra indicadores gerais: total de OPDs, atividades, tarefas proximas e atrasadas. O Calendario de Entregas apresenta as OPDs por data de entrega com percentual de conclusao, facilitando o planejamento. Bom trabalho!',
      },
    ],
  },
];

// ============================================
// Speech synthesis helper
// ============================================

function useSpeech() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    u.rate = 1.0;
    u.pitch = 1.0;

    // Prefer a pt-BR voice
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith('pt') && v.name.includes('Google')) ||
                    voices.find(v => v.lang.startsWith('pt-BR')) ||
                    voices.find(v => v.lang.startsWith('pt'));
    if (ptVoice) u.voice = ptVoice;

    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);

    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
  }, []);

  const stop = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking };
}

// ============================================
// Tutorial Modal Component
// ============================================

export default function TutorialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoNarrate, setAutoNarrate] = useState(true);
  const { speak, stop, speaking } = useSpeech();

  // Load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // Auto-narrate on slide change
  useEffect(() => {
    if (selectedTutorial && autoNarrate) {
      const slide = selectedTutorial.slides[currentSlide];
      if (slide) {
        // Small delay to let animation start
        const t = setTimeout(() => speak(slide.narration), 400);
        return () => clearTimeout(t);
      }
    }
  }, [selectedTutorial, currentSlide, autoNarrate, speak]);

  // Stop speech on close
  useEffect(() => {
    if (!open) { stop(); setSelectedTutorial(null); setCurrentSlide(0); }
  }, [open, stop]);

  // Keyboard nav
  useEffect(() => {
    if (!open || !selectedTutorial) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'Escape') { e.preventDefault(); handleBack(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const goNext = () => {
    if (!selectedTutorial) return;
    stop();
    if (currentSlide < selectedTutorial.slides.length - 1) setCurrentSlide(c => c + 1);
  };
  const goPrev = () => {
    stop();
    if (currentSlide > 0) setCurrentSlide(c => c - 1);
  };
  const handleBack = () => {
    stop();
    if (selectedTutorial) { setSelectedTutorial(null); setCurrentSlide(0); }
    else onClose();
  };

  if (!open) return null;

  const slide = selectedTutorial?.slides[currentSlide];
  const total = selectedTutorial?.slides.length || 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleBack}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {selectedTutorial && (
              <button onClick={handleBack} className="p-1 hover:bg-white/20 rounded transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="font-bold text-lg">
                {selectedTutorial ? selectedTutorial.title : 'Tutoriais do Portal Pili'}
              </h2>
              {selectedTutorial && (
                <p className="text-red-200 text-xs">Slide {currentSlide + 1} de {total}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedTutorial && (
              <button
                onClick={() => { setAutoNarrate(!autoNarrate); if (speaking) stop(); }}
                className={`p-2 rounded-lg transition text-sm flex items-center gap-1 ${
                  autoNarrate ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'
                }`}
                title={autoNarrate ? 'Desativar narração' : 'Ativar narração'}
              >
                {autoNarrate ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM11 5L6 9H2v6h4l5 4V5zm5 7c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H2v6h4l5 4v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                )}
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedTutorial ? (
            /* Tutorial list */
            <div className="p-6 space-y-4">
              <p className="text-gray-500 text-sm">Escolha um tutorial para comecar:</p>
              {TUTORIALS.map(tutorial => (
                <button
                  key={tutorial.id}
                  onClick={() => { setSelectedTutorial(tutorial); setCurrentSlide(0); }}
                  className="w-full text-left bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl p-5 transition group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{tutorial.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-red-700 transition">{tutorial.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{tutorial.description}</p>
                      <p className="text-xs text-gray-400 mt-2">{tutorial.slides.length} slides com narracao</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-300 group-hover:text-red-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          ) : slide ? (
            /* Slide content */
            <div className="p-6">
              {/* Progress bar */}
              <div className="flex gap-1 mb-6">
                {selectedTutorial.slides.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      i <= currentSlide ? 'bg-red-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-4">{slide.title}</h3>

              <ul className="space-y-3 mb-6">
                {slide.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <span className="text-gray-700 text-sm leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>

              {/* Narration text box */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 relative">
                <div className="absolute -top-2.5 left-4 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  NARRACAO
                </div>
                <p className="text-sm text-gray-600 italic leading-relaxed mt-1">{slide.narration}</p>
                {/* Play button */}
                <button
                  onClick={() => speaking ? stop() : speak(slide.narration)}
                  className={`mt-3 flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                    speaking
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {speaking ? (
                    <>
                      <div className="flex gap-0.5 items-end h-3">
                        <div className="w-0.5 bg-red-500 animate-pulse" style={{height: '8px', animationDelay: '0ms'}} />
                        <div className="w-0.5 bg-red-500 animate-pulse" style={{height: '12px', animationDelay: '150ms'}} />
                        <div className="w-0.5 bg-red-500 animate-pulse" style={{height: '6px', animationDelay: '300ms'}} />
                        <div className="w-0.5 bg-red-500 animate-pulse" style={{height: '10px', animationDelay: '450ms'}} />
                      </div>
                      Parar narracao
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      Ouvir narracao
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer navigation */}
        {selectedTutorial && (
          <div className="border-t bg-gray-50 px-6 py-3 flex items-center justify-between shrink-0">
            <button
              onClick={goPrev}
              disabled={currentSlide === 0}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              &larr; Anterior
            </button>
            <div className="flex gap-1.5">
              {selectedTutorial.slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { stop(); setCurrentSlide(i); }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentSlide ? 'bg-red-500 scale-125' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={currentSlide === total - 1 ? handleBack : goNext}
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              {currentSlide === total - 1 ? 'Concluir' : 'Proximo →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Tutorial Button (pulsing icon)
// ============================================

export function TutorialButton() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem('pili-tutorial-dismissed');
    if (d) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pili-tutorial-dismissed', '1');
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-20 right-6 z-50 w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 ${
          !dismissed ? 'animate-bounce' : ''
        }`}
        title="Tutoriais"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {!dismissed && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white animate-ping" />
        )}
      </button>

      {/* Tooltip when not dismissed */}
      {!dismissed && !open && (
        <div className="fixed bottom-[90px] right-6 z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg animate-fadeIn">
          <button onClick={handleDismiss} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-700 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-gray-600">&times;</button>
          Clique para ver os tutoriais!
          <div className="absolute -bottom-1 right-6 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}

      <TutorialModal open={open} onClose={() => { setOpen(false); handleDismiss(); }} />
    </>
  );
}
