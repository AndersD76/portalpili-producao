export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Politica de Privacidade</h1>
        <p className="text-sm text-gray-500 mb-6">Ultima atualizacao: 25 de fevereiro de 2026</p>

        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">1. Dados Coletados</h2>
            <p>
              O Portal Pili coleta dados estritamente necessarios para o funcionamento do sistema
              de gestao comercial: nome, email, telefone e dados de propostas comerciais dos
              vendedores e clientes cadastrados.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">2. Uso dos Dados</h2>
            <p>
              Os dados sao utilizados exclusivamente para gerenciamento do pipeline comercial,
              envio de notificacoes via WhatsApp sobre status de propostas, e comunicacao interna
              entre a equipe de vendas da Pili Equipamentos.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">3. WhatsApp Business API</h2>
            <p>
              Utilizamos a API do WhatsApp Business para enviar mensagens de atualizacao de
              status de propostas aos vendedores cadastrados. Os numeros de telefone sao
              armazenados de forma segura e utilizados apenas para esta finalidade.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">4. Armazenamento</h2>
            <p>
              Os dados sao armazenados em banco de dados seguro com criptografia em transito
              (SSL/TLS). O acesso e restrito a usuarios autenticados com permissoes adequadas.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">5. Compartilhamento</h2>
            <p>
              Nao compartilhamos dados pessoais com terceiros, exceto conforme exigido por lei
              ou para o funcionamento dos servicos essenciais (Meta/WhatsApp para envio de mensagens).
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">6. Contato</h2>
            <p>
              Para duvidas sobre privacidade, entre em contato com a Pili Equipamentos
              atraves dos canais oficiais da empresa.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t text-xs text-gray-400">
          Pili Equipamentos - Portal de Gestao Comercial
        </div>
      </div>
    </div>
  );
}
