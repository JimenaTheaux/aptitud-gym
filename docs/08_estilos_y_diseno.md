# 08 — Estilos y diseño

Fuente de verdad: `aptitud-manual-diseno.md` (validado con cliente). Este doc tiene prioridad sobre skills genéricas (`frontend-standards`) en todo lo referido a color/tipografía/íconos/botones — mismo criterio que Tropa Gym con su doc 08.

**Adjuntar este doc en CADA prompt de UI.**

## Tema: DARK (confirmado)

### Paleta base
| Token | Hex | Uso |
|---|---|---|
| `bg-page` | `#0B2240` | Fondo general |
| `bg-card` | `#132C4D` | Tarjetas, paneles, header |
| `bg-input` | `#0F2545` | Inputs, tiles de teclado |
| `border-subtle` | `#1D3B60` | Bordes de cards e inputs |
| `accent-cyan` | `#2EB9FE` | Marca — botones primarios, acentos, iconos activos |

### Texto
| Token | Hex | Uso |
|---|---|---|
| `text-primary` | `#FFFFFF` | Títulos, nombres, valores |
| `text-secondary` | `#7FA9CF` | Labels, secundarios |
| `text-muted` | `#6089AF` | Placeholders |
| `text-on-accent` | `#0B2240` | Texto sobre fondo cyan |

### Estados semánticos (paleta vívida — confirmado)
| Estado | Color | Badge fondo | Badge texto | Barra superior card |
|---|---|---|---|---|
| Al día | `#00E68A` | `rgba(0,230,138,0.15)` | `#00E68A` | `#00E68A` |
| Pendiente | `#FFA23D` | `rgba(255,162,61,0.15)` | `#FFA23D` | `#FFA23D` |
| Deuda | `#FF5C5C` | `rgba(255,92,92,0.15)` | `#FF5C5C` | `#FF5C5C` |
| Error / borrar | `#FF5C5C` | — | `#FF5C5C` | — |

**Regla clave:** la barra superior de la card SIEMPRE coincide con el color del estado real (verde/naranja/rojo) — no queda fija en cyan para "al día". El cyan de marca (`#2EB9FE`) se reserva para acentos y botones primarios, no para estados.

Badge: pill (`border-radius: 99px`), fondo = color al 15% de opacidad, texto = color sólido, con punto `●` del mismo color.
Card: `bg-card`, `border-subtle`, borde superior de 4px sólido en el color del estado, radio inferior de card sin redondear arriba (el borde de color ocupa esa esquina).

Regla: sin fondos sólidos de color en cards — el color va en borde superior + badge + texto, nunca de fondo completo.

## Tipografía (confirmado: Montserrat + Inter)
| Fuente | Rol |
|---|---|
| **Montserrat** 600/700/800 | Nombre de marca, títulos, números de teclado, botones |
| **Inter** 400/500/600 | Labels, textos de datos, badges, placeholders |

Jerarquía:
- Título de card / nombre de marca: Montserrat 700-800, 16-19px
- Botones: Montserrat 700, 13-14px
- Labels (uppercase, tracking .04em): Inter 600, 11px
- Datos de cuerpo: Inter 400-500, 13-14px

## Iconografía (confirmado: lineales simples)
Set lineal simple — calendario, flecha de ingreso, reloj, tarjeta, check, usuario+. Tamaño ~14-18px, acompañando texto en labels/botones. **NO Material Symbols, NO Lucide por default, NO emojis.** Elegir un único set consistente antes de Fase 1 (ver nota abajo).

> Nota: definir set de íconos concreto (ej. Phosphor Icons "light/regular", Feather, Tabler Icons) antes de escribir el primer componente. El manual pide "lineales simples" pero no fija la librería — decisión técnica a cerrar en Fase 1 de desarrollo (identidad visual).

## Componentes

**Botón primario:** `background: accent-cyan`, `color: text-on-accent`, `border-radius: 10-12px`, Montserrat 700.

**Card:** `background: bg-card`, `border: 1px solid border-subtle`, `border-radius: 16px`. Cards de estado con barra superior 4-5px del color del estado.

**Input/tile teclado:** `background: bg-input`, `border: 1px solid border-subtle`, `border-radius: 10px`.

**Badge de estado:** pill (`border-radius: 99px`), fondo suave del estado, texto en tono fuerte, punto `●` indicador.

**Chip de selección:** no seleccionado = borde `border-subtle` + texto `text-secondary`; seleccionado = borde/fondo suave `accent-cyan` + texto `#8FDBFF`/blanco.

**Botón backspace:** mismo estilo de tile, ícono/texto en rojo de error.

## Layout
- Grid 2 columnas en check-in: panel identificación + teclado (~1.1fr) | panel estado de cuenta/acción (1fr).
- Header: logo + marca a la izquierda, "¿Primera vez?" destacado en cyan a la derecha.
- Footer: texto centrado, chico, `text-secondary` apagado.
- Bordes redondeados generosos (10-20px), sin sombras duras, sin gradientes, sin blur — superficies planas, jerarquía por color y borde.

## Anti-patterns (heredado de frontend-standards)
- No `window.alert` — usar Drawer/ConfirmDialog propios.
- No mezclar sets de íconos.
- No fondos sólidos de color en badges/cards de estado.
- No más de un botón "sólido" cyan por pantalla.

---

## Formularios y Drawer — spec de espaciado y accesibilidad

Problemas detectados en testing (ver captura "Nuevo alumno"): scrollbar nativo blanco, date picker nativo con mal contraste, espaciado inconsistente entre campos. Spec fija para todo formulario del sistema:

### Medidas
- Alto de input: `44px` mínimo (target táctil, clave en la tablet kiosco).
- Espacio entre campos (label + input) como grupo: `16px` de gap vertical entre grupos.
- Espacio label → input: `6px`.
- Padding interno del Drawer: `24px` en desktop, `16px` en mobile.
- Ancho máximo de campo: el Drawer no fuerza full-bleed — dejar `max-width: 480px` centrado si el drawer es más ancho, para que el input no se vea gigante y vacío.

### Scrollbar del Drawer
Nunca dejar el scrollbar nativo por default (blanco, grueso, no coincide con el tema). Estilizar con `border-subtle` como thumb, track transparente, ancho ~6-8px.

### Inputs de fecha
`<input type="date">` nativo tiene mal contraste en dark (el ícono de calendario queda claro sobre fondo oscuro sin forma de tematizarlo bien entre navegadores). Opciones, en orden de preferencia:
1. Forzar `color-scheme: dark` en el input + `accent-color: var(--accent-cyan)` — fix rápido, cubre la mayoría de navegadores modernos.
2. Si no alcanza el contraste, reemplazar por un date-picker propio simple (popover con `Drawer`/`ConfirmDialog` ya existente como base), consistente con el resto del sistema.

### Campos obligatorios y errores
- Asterisco o indicador visual en el label de campos obligatorios (DNI, apellido, nombre).
- Error inline debajo del input, en el rojo de error (`#FF8A8A`), no alert ni toast genérico.
- Foco visible: ring de 2px en `accent-cyan` al hacer focus-visible en cualquier input — nunca quitar el outline sin reemplazo.

### Layout del Drawer
- Header fijo (título + botón cerrar) y footer fijo (botones de acción) — solo el body de campos scrollea.
- Botón "cerrar" (X) con `aria-label="Cerrar"`, alcanzable por teclado, cierra también con `Escape`.
- El elemento que abrió el Drawer (ej. "Nuevo alumno") no debe quedar visualmente "flotando" detrás — el overlay debe cubrir todo detrás del Drawer con un scrim, no dejar la card de fondo parcialmente visible y clickeable.

---

## Fijar filas (todas las tablas admin)

Función tipo "fijar" de WhatsApp, disponible en **todas** las tablas del sistema para el rol admin. Máximo 5 filas fijadas por tabla.

- Ícono de pin como primer ícono del cluster de acciones (antes de WhatsApp/editar/eliminar): outline `#7FA9CF` sin fijar, sólido `#2EB9FE` fijado.
- Filas fijadas se ordenan siempre arriba del resto (por encima incluso de cualquier orden/filtro activo).
- Fila fijada: `border-left: 3px solid #2EB9FE` + fondo `rgba(46,185,254,0.06)`.
- Tag "Fijado" — pill pequeña arriba a la izquierda de la fila (nunca a la derecha, ahí van las acciones): fondo `#2EB9FE` sólido, texto `#0B2240` (oscuro, no blanco — mejor contraste sobre cyan), ícono de pin relleno.
- Al llegar a 5 fijadas en una tabla, deshabilitar el ícono de pin en las demás filas con mensaje inline ("Máximo 5 filas fijadas") en vez de dejar fallar silenciosamente.

---

## Mapa de calor de ocupación (Resúmenes → Turnos)

Reusa la misma paleta de estados (cyan/naranja/rojo) pero para un significado distinto: ocupación de la sala, no estado de cuenta de un alumno.

- Grilla: filas = franjas horarias, columnas = días. Celda = color de ocupación + contador de alumnos en el centro, número en negrita.
- **Libre** (0-3 alumnos): `#2EB9FE`, texto `#0B2240`.
- **Quedan cupos** (4-6 alumnos): `#FFA23D`, texto `#0B2240`.
- **Capacidad llena** (7+ alumnos): `#FF5C5C`, texto oscuro `#4A1010` (no `#0B2240` — mejor contraste sobre rojo).
- Celdas `border-radius: 8px`, sin bordes extra — el color de fondo ya comunica el estado.
- Leyenda fija arriba de la grilla: 3 puntos de color + label, mismo criterio que cualquier leyenda de estado del sistema.

---

## Branding / footer deciDATA

### Archivo del logo
`public/branding/decidata-logo-white.png` — PNG blanco, ~11 KB, fondo transparente. Funciona directo sobre el tema dark de Aptitud (`bg-page #0B2240`), sin necesidad de variante oscura (esa variante solo hace falta en proyectos con fondo claro).

### Cómo guardarlo
1. Crear `public/branding/` en la raíz de la app Vite (mismo nivel que `public/favicon.ico`).
2. Copiar el PNG con el nombre `decidata-logo-white.png`. Vite sirve todo `public/` en la raíz del sitio → se referencia como `/branding/decidata-logo-white.png`, sin `import`.

### Componente `Footer.tsx` (`src/components/layout/Footer.tsx`)
Dos variantes por prop `prominent`, reutilizado de Tropa Gym — **adaptar las clases de color a los tokens de Aptitud** (`text-secondary`, `bg-page`, `border-subtle` en vez de `on-surface-variant`, `background`, `outline-variant`):

```tsx
export function Footer({ prominent = false }: { prominent?: boolean }) {
  if (prominent) {
    return (
      <footer className="mt-auto flex flex-wrap items-center justify-center gap-2 pt-2 font-inter text-xs text-text-secondary">
        <img
          src="/branding/decidata-logo-white.png"
          alt="deciDATA"
          className="h-4 w-auto opacity-90"
        />
        <span className="font-semibold text-text-primary">deciDATA</span>
        <span>© 2026 · Todos los derechos reservados</span>
      </footer>
    )
  }

  return (
    <footer className="static mt-8 flex flex-wrap items-center justify-center gap-2 border-t border-border-subtle bg-bg-page py-3 font-inter text-[11px] text-text-secondary md:fixed md:inset-x-0 md:bottom-0 md:z-30 md:mt-0 md:h-8 md:flex-nowrap md:px-gutter md:py-0">
      <img
        src="/branding/decidata-logo-white.png"
        alt="deciDATA"
        className="h-[14px] w-auto opacity-70"
      />
      <span>deciDATA</span>
      <span>© 2026 · Todos los derechos reservados</span>
    </footer>
  )
}
```

### Dónde se usa
- `Footer` (default) → en `AppLayout.tsx`, fijo/discreto 32px de alto pegado abajo en desktop, estático en mobile. Toda la app autenticada (admin/profesor).
- `<Footer prominent />` → solo en la pantalla de check-in/autoregistro (equivalente a `CheckinAlumno.tsx` de Tropa) — más grande y con mayor prioridad visual, porque es la pantalla que ve el cliente final del gimnasio sin supervisión.

### Nota
"© 2026" está hardcodeado, no `new Date().getFullYear()`. Actualizar a mano cada año o cambiar a dinámico al reutilizar.
