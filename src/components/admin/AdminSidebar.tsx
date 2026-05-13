'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { setLojaAtiva } from '@/app/actions'
import type { UsuarioPerfil, Loja } from '@/types'

interface AdminSidebarProps {
  perfil: (UsuarioPerfil & { loja: Loja | null }) | null
  loja: Loja | null
  lojas: Loja[]
}

function IconDashboard() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCar() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 17H3v-4l2.5-5h11L19 13v4h-2m-10 0a2 2 0 104 0 2 2 0 00-4 0zm8 0a2 2 0 104 0 2 2 0 00-4 0z" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconMoney() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconUserCog() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

const menuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { href: '/admin/veiculos', label: 'Veículos', Icon: IconCar },
  { href: '/admin/crm', label: 'CRM', Icon: IconUsers },
  { href: '/admin/financeiro', label: 'Financeiro', perfis: ['gerente', 'diretor', 'admin'], Icon: IconMoney },
  { href: '/admin/relatorios', label: 'Relatórios', perfis: ['gerente', 'diretor', 'admin'], Icon: IconChart },
  { href: '/admin/configuracoes', label: 'Configurações', perfis: ['gerente', 'diretor', 'admin'], Icon: IconSettings },
  { href: '/admin/usuarios', label: 'Usuários', perfis: ['diretor', 'admin'], Icon: IconUserCog },
]

const perfilBadgeClass: Record<string, string> = {
  vendedor: 'bg-gray-100 text-gray-600',
  gerente: 'bg-blue-50 text-blue-600',
  diretor: 'bg-purple-50 text-purple-600',
  admin: 'bg-red-50 text-red-600',
}

export default function AdminSidebar({ perfil, loja, lojas }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileAberto, setMobileAberto] = useState(false)

  const corPrimaria = loja?.cor_primaria ?? '#F5C842'

  async function sair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleLojaChange(lojaId: string) {
    await setLojaAtiva(lojaId)
    router.refresh()
  }

  const filteredMenu = menuItems.filter(item => {
    if (!item.perfis) return true
    return perfil?.perfil && item.perfis.includes(perfil.perfil)
  })

  const initials = (perfil?.nome ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const lojaInitials = (loja?.nome ?? 'GC').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const sidebar = (
    <div
      className="w-60 shrink-0 flex flex-col h-full"
      style={{ backgroundColor: '#FAFAFA', borderRight: '1px solid #E5E5E5' }}
    >
      {/* Header: logo + nome da loja */}
      <div className="px-4 py-5" style={{ borderBottom: '1px solid #E5E5E5' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
            style={{ backgroundColor: corPrimaria, color: '#111111' }}
          >
            {lojaInitials}
          </div>
          <div className="min-w-0">
            <p className="text-[#111] text-sm font-bold truncate leading-tight">
              {loja?.nome ?? 'Grupo Catingueira'}
            </p>
            <p className="text-[#9CA3AF] text-xs">Painel admin</p>
          </div>
        </div>
      </div>

      {/* Seletor de loja */}
      {lojas.length > 1 && (
        <div className="px-3 pt-3">
          <select
            defaultValue={loja?.id ?? ''}
            onChange={e => handleLojaChange(e.target.value)}
            className="w-full rounded-lg px-3 py-1.5 text-xs text-[#374151] bg-white border border-[#E5E5E5] focus:outline-none focus:border-[var(--cor-primaria)] transition-colors"
          >
            {lojas.map(l => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {filteredMenu.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                active
                  ? 'text-[#111111] bg-[#F0F0F0]'
                  : 'text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F5F5]'
              }`}
            >
              {active && (
                <span
                  className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r-full"
                  style={{ backgroundColor: corPrimaria }}
                />
              )}
              <item.Icon />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer: user + actions */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid #E5E5E5' }}>
        <div className="flex items-center gap-2.5 mb-3 px-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-[#6B7280]"
            style={{ backgroundColor: '#F0F0F0' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[#111] text-xs font-medium truncate leading-tight">
              {perfil?.nome ?? 'Usuário'}
            </p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize font-medium ${perfilBadgeClass[perfil?.perfil ?? 'vendedor']}`}>
              {perfil?.perfil ?? ''}
            </span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <a
            href="/"
            target="_blank"
            className="flex-1 py-1.5 rounded-md text-xs text-[#6B7280] hover:text-[#111] text-center transition-colors border border-[#E5E5E5] hover:border-[#D0D0D0] bg-white"
          >
            Ver site
          </a>
          <button
            onClick={sair}
            className="flex-1 py-1.5 rounded-md text-xs text-[#6B7280] hover:text-red-600 transition-colors border border-[#E5E5E5] hover:border-red-200 bg-white"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setMobileAberto(!mobileAberto)}
          className="rounded-lg p-2 bg-white shadow-sm"
          style={{ border: '1px solid #E5E5E5' }}
        >
          <svg className="w-5 h-5 text-[#374151]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {mobileAberto && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMobileAberto(false)}
        />
      )}

      <div className="hidden md:flex h-screen sticky top-0">{sidebar}</div>

      <div
        className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-200 ${
          mobileAberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </div>
    </>
  )
}
