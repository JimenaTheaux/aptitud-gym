import { supabase } from './supabase'
import type { ConfiguracionWhatsapp } from '../types/db'

export type ConfiguracionWhatsappInput = {
  mensaje_deudores: string
  mensaje_bienvenida: string
}

// Fila única (id = 1, migración 10) con las plantillas configurables desde
// Configuración > WhatsApp.
export async function getConfiguracionWhatsapp(): Promise<ConfiguracionWhatsapp> {
  const { data, error } = await supabase
    .from('configuracion_whatsapp')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) throw error
  return data as ConfiguracionWhatsapp
}

export async function updateConfiguracionWhatsapp(
  input: ConfiguracionWhatsappInput,
): Promise<ConfiguracionWhatsapp> {
  const { data, error } = await supabase
    .from('configuracion_whatsapp')
    .update(input)
    .eq('id', 1)
    .select()
    .single()

  if (error) throw error
  return data as ConfiguracionWhatsapp
}
