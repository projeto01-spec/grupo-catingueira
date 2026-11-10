import type { Veiculo } from '@/types'

// Fonte única do que o site público pode ler de um veículo.
//
// O site lê da view `veiculos_publicos` (migration 021), que já filtra
// status='disponivel', rascunho=false e excluido=false e só expõe colunas
// seguras. Placa, chassi, renavam, hodômetro de venda, data de aquisição,
// dados de sócio e colunas da OLX NUNCA entram aqui — nem na view, nem nesta
// lista, nem em props de componentes client do site.
//
// A view também traz ano_fabricacao/ano_modelo/condicao quando a migration
// 018 estiver aplicada, mas eles ficam de fora desta lista até a 018 ser
// confirmada no banco (selecionar coluna inexistente derruba a consulta).

export const VIEW_VEICULOS_PUBLICOS = 'veiculos_publicos'

export const COLUNAS_VEICULO_PUBLICO = [
  'id',
  'loja_id',
  'marca',
  'modelo',
  'versao',
  'ano',
  'cor',
  'km',
  'combustivel',
  'cambio',
  'preco',
  'valor_oferta',
  'tipo',
  'portas',
  'descricao',
  'opcionais',
  'status',
  'destaque',
  'fotos',
  'created_at',
] as const satisfies readonly (keyof Veiculo)[]

/** String pronta para `.select()`. */
export const SELECT_VEICULO_PUBLICO = COLUNAS_VEICULO_PUBLICO.join(', ')

export type VeiculoPublico = Pick<Veiculo, (typeof COLUNAS_VEICULO_PUBLICO)[number]>
