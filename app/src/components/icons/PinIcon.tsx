import type { SVGProps } from 'react'

// react-feather no tiene ícono de pin — glifo propio (mismo estilo lineal que
// el resto del set: 24x24, stroke-width 2, cabos y uniones redondeados),
// con variante `filled` para el estado fijado (doc 08, sección "Fijar filas").
export function PinIcon({
  size = 16,
  filled = false,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; filled?: boolean }) {
  if (filled) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        {...props}
      >
        <path d="M14.5 2a1 1 0 0 1 1 1v5.1l2.62 5.24a1 1 0 0 1-.9 1.45H13v6.2a1 1 0 1 1-2 0v-6.2H6.78a1 1 0 0 1-.9-1.45L8.5 8.1V3a1 1 0 0 1 1-1z" />
      </svg>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9.5 3h5" />
      <path d="M9.5 3v5.1l-2.62 5.24a1 1 0 0 0 .9 1.45h8.44a1 1 0 0 0 .9-1.45L14.5 8.1V3" />
      <path d="M12 14.8V21" />
    </svg>
  )
}
