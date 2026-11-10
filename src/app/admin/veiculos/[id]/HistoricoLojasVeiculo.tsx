import type { VeiculoTransferencia } from '@/types'

// Bloco "Histórico de lojas" da aba Dados: loja onde o veículo foi cadastrado
// e cada transferência em ordem (de → para, data, quem fez). Mesmo padrão
// visual dos cards do admin (VeiculoForm / Documentação).

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function HistoricoLojasVeiculo({
  lojaCadastroNome,
  criadoEm,
  transferencias,
}: {
  lojaCadastroNome: string
  criadoEm: string
  transferencias: VeiculoTransferencia[]
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm mb-6">
      <h2 className="text-[#111827] font-bold text-sm uppercase tracking-wider mb-4">Histórico de lojas</h2>
      <ol className="relative border-l-2 border-[#E5E7EB] ml-1.5 space-y-4">
        <li className="relative pl-4">
          <span className="absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full bg-[#F5C842] border-2 border-white" aria-hidden="true" />
          <p className="text-sm text-[#111827]">
            Cadastrado na <span className="font-semibold">{lojaCadastroNome}</span>
          </p>
          <p className="text-xs text-[#6B7280]">{formatarData(criadoEm)}</p>
        </li>
        {transferencias.map(t => (
          <li key={t.id} className="relative pl-4">
            <span className="absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full bg-[#9CA3AF] border-2 border-white" aria-hidden="true" />
            <p className="text-sm text-[#111827]">
              Transferido de <span className="font-semibold">{t.loja_origem?.nome ?? 'loja anterior'}</span>
              {' → '}
              <span className="font-semibold">{t.loja_destino?.nome ?? 'outra loja'}</span>
            </p>
            <p className="text-xs text-[#6B7280]">
              {formatarData(t.data_transferencia)}
              {t.usuario?.nome ? ` · por ${t.usuario.nome}` : ''}
            </p>
            {t.observacoes && <p className="text-xs text-[#6B7280] mt-0.5">{t.observacoes}</p>}
          </li>
        ))}
      </ol>
      {transferencias.length === 0 && (
        <p className="text-xs text-[#9CA3AF] mt-3">Nenhuma transferência entre lojas.</p>
      )}
    </div>
  )
}
