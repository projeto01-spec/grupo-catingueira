'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Props {
  fotos: string[]
  titulo: string
  statusLabel: string
  statusCls: string
}

export default function GaleriaClient({ fotos, titulo, statusLabel, statusCls }: Props) {
  const [current, setCurrent] = useState(0)

  if (fotos.length === 0) {
    return (
      <div className="aspect-[4/3] rounded-xl bg-[#F5F5F5] flex items-center justify-center">
        <svg className="w-20 h-20 text-[#D0D0D0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#F5F5F5]">
        <Image
          src={fotos[current]}
          alt={`${titulo} — foto ${current + 1}`}
          fill
          className="object-cover"
          priority={current === 0}
          sizes="(max-width: 1024px) 100vw, 55vw"
        />
        {statusLabel !== 'Disponível' && (
          <span className={`absolute top-3 left-3 text-xs font-bold uppercase px-3 py-1 rounded-full ${statusCls}`}>
            {statusLabel}
          </span>
        )}
        {fotos.length > 1 && (
          <>
            <button
              onClick={() => setCurrent(i => (i - 1 + fotos.length) % fotos.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow transition-colors"
              aria-label="Foto anterior"
            >
              <svg className="w-4 h-4 text-[#111]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrent(i => (i + 1) % fotos.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow transition-colors"
              aria-label="Próxima foto"
            >
              <svg className="w-4 h-4 text-[#111]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="absolute bottom-3 right-3 text-xs text-white bg-black/50 px-2 py-0.5 rounded-full">
              {current + 1}/{fotos.length}
            </span>
          </>
        )}
      </div>
      {fotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fotos.map((foto, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`relative aspect-square w-16 shrink-0 rounded-lg overflow-hidden transition-all ${
                i === current ? 'opacity-100' : 'opacity-60 hover:opacity-80'
              }`}
              style={i === current ? { outline: '2px solid var(--cor-primaria)', outlineOffset: '1px' } : {}}
            >
              <Image
                src={foto}
                alt={`Thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
