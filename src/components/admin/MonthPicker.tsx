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
      className="bg-white border border-[#E5E5E5] rounded-lg px-3 py-2 text-[#111] text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors"
    />
  )
}
