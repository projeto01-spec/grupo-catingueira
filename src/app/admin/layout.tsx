import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { resolverLojaAtiva } from '@/lib/loja-ativa'
import { createClient } from '@supabase/supabase-js'
import { AdminProvider } from '@/contexts/AdminContext'
import type { Loja, UsuarioPerfil } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminBottomBar from '@/components/admin/AdminBottomBar'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = adminClient()

  // Perfil e lojas não dependem um do outro (só de user.id já resolvido) — roda em paralelo.
  const [{ data: perfilData }, { data: lojasData }] = await Promise.all([
    admin
      .from('usuarios_perfil')
      .select('id, nome, perfil, loja_id, ativo, modulos_permitidos, created_at')
      .eq('id', user.id)
      .single(),
    // Admin client garante que todas as lojas são retornadas, sem depender de RLS
    admin.from('lojas').select('*').order('nome'),
  ])

  // Sem perfil ou desativado: encerra a sessão (via route handler, que pode
  // apagar cookie — este layout não pode) em vez de só mandar para /login,
  // senão o /login veria a sessão ainda válida.
  if (!perfilData || perfilData.ativo !== true) redirect('/api/auth/sair')

  const perfil: UsuarioPerfil = {
    ...(perfilData as UsuarioPerfil),
    modulos_permitidos: (perfilData as UsuarioPerfil).modulos_permitidos ?? [],
  }
  // Deduplica por id: proteção contra seeds duplicados (cada id aparece uma só vez)
  const seenIds = new Set<string>()
  const todasLojas = ((lojasData ?? []) as Loja[]).filter(l => {
    if (seenIds.has(l.id)) return false
    seenIds.add(l.id)
    return true
  })

  // Mesma regra das páginas, actions e PDFs (lib/loja-ativa.ts) — antes o
  // seletor caía em lojas[0] sem cookie e as páginas em perfil.loja_id, e o
  // rótulo mostrava uma loja com os dados da outra.
  const ativa = await resolverLojaAtiva(perfil)
  const idsPermitidos = new Set(ativa.lojasPermitidas.map(l => l.id))
  const lojas: Loja[] = todasLojas.filter(l => idsPermitidos.has(l.id))
  const lojaAtiva: Loja | null = todasLojas.find(l => l.id === ativa.loja?.id) ?? null

  const perfilComLoja: UsuarioPerfil & { loja: Loja | null } = {
    ...perfil,
    loja: lojaAtiva,
  }

  return (
    <AdminProvider value={{ perfil, loja: lojaAtiva, lojas }}>
      <div className="min-h-screen bg-[#F8F8F8] flex">
        <AdminSidebar perfil={perfilComLoja} loja={lojaAtiva} lojas={lojas} />
        <main className="flex-1 min-w-0 overflow-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
      <AdminBottomBar perfil={perfil} />
    </AdminProvider>
  )
}
