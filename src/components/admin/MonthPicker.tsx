'use client'

export default function MonthPicker({
  value,
  basePath,
}: {
  value: string
  basePath: string
}) {
  return (
    <input
      type="month"
      defaultValue={value}
      onChange={e => {
        window.location.href = `${basePath}?mes=${e.target.value}`
      }}
      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors"
    />
  )
}
