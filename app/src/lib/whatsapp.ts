import { supabase } from './supabase'
import { formatearMonto } from './formato'
import type { Alumno, WhatsappEnvio } from '../types/db'

export type NuevoWhatsappEnvioInput = {
  alumno_id: string
  plantilla_usada: string
  enviado_por: string
}

// Log de intención de envío (doc 04/06) — no confirma entrega, solo que se
// abrió el link de wa.me con este texto para este alumno.
export async function registrarWhatsappEnvio(input: NuevoWhatsappEnvioInput): Promise<WhatsappEnvio> {
  const { data, error } = await supabase.from('whatsapp_envios').insert(input).select().single()
  if (error) throw error
  return data as WhatsappEnvio
}

// wa.me solo acepta dígitos en el número (sin '+', espacios ni guiones) —
// alumnos.celular se guarda como '+549 11XXXXXXXX' (ver AltaAlumnoForm).
function celularSoloDigitos(celular: string): string {
  return celular.replace(/\D/g, '')
}

export function linkWhatsapp(celular: string, mensaje: string): string {
  return `https://wa.me/${celularSoloDigitos(celular)}?text=${encodeURIComponent(mensaje)}`
}

// Reemplaza los placeholders de la plantilla por los datos del alumno — el
// texto final (ya reemplazado) es lo que se guarda en whatsapp_envios.plantilla_usada.
export function aplicarPlantilla(plantilla: string, alumno: Alumno): string {
  return plantilla.replaceAll('{nombre}', alumno.nombre)
}

// Variante para el mensaje de deudores (Pagos > Deudores), que además
// reemplaza {monto} con el saldo pendiente.
export function aplicarPlantillaDeuda(plantilla: string, alumno: Alumno, montoPendiente: number): string {
  return aplicarPlantilla(plantilla, alumno).replaceAll('{monto}', formatearMonto(montoPendiente))
}
