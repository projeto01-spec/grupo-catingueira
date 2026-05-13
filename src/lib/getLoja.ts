import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function getLoja() {
  try {
    const headersList = await headers()
    const host =
      headersList.get('x-forwarded-host') ||
      headersList.get('host') ||
      'localhost'
    const dominio = host.replace('www.', '').split(':')[0].trim()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: loja } = await supabase
      .from('lojas')
      .select('*')
      .eq('dominio', dominio)
      .single()

    if (loja) return loja

    const { data: fallback } = await supabase
      .from('lojas')
      .select('*')
      .order('created_at')
      .limit(1)
      .single()

    return fallback ?? null
  } catch {
    return null
  }
}
