import { cookies } from 'next/headers'
import type { UsuarioPerfil } from '@/types'

export async function getLojaIdAtiva(perfil: UsuarioPerfil): Promise<string> {
  if (perfil.perfil === 'diretor' || perfil.perfil === 'admin') {
    const cookieStore = await cookies()
    const override = cookieStore.get('loja_ativa')?.value
    if (override) return override
  }
  return perfil.loja_id
}
