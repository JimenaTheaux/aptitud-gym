import type { SelectHTMLAttributes } from 'react'

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  error?: string
}

export function SelectField({
  label,
  error,
  id,
  required,
  children,
  ...selectProps
}: SelectFieldProps) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const errorId = error ? `${selectId}-error` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={selectId}
        className="font-inter text-[11px] font-semibold uppercase tracking-[0.04em] text-text-secondary"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-estado-error-text">
            *
          </span>
        )}
      </label>

      <select
        id={selectId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`h-11 w-full rounded-[10px] border bg-bg-input px-3 font-inter text-base text-text-primary outline-none transition-colors focus:border-accent-cyan focus-visible:ring-2 focus-visible:ring-accent-cyan xl:h-10 xl:text-[13px] ${
          error ? 'border-estado-error-text' : 'border-border-subtle'
        }`}
        {...selectProps}
      >
        {children}
      </select>

      {error && (
        <span id={errorId} className="font-inter text-[11px] text-estado-error-text">
          {error}
        </span>
      )}
    </div>
  )
}
