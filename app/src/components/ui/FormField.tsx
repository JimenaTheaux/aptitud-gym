import type { InputHTMLAttributes, ReactNode } from 'react'

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  endAdornment?: ReactNode
}

export function FormField({
  label,
  error,
  id,
  endAdornment,
  required,
  ...inputProps
}: FormFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="font-inter text-[11px] font-semibold uppercase tracking-[0.04em] text-text-secondary"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-estado-error-text">
            *
          </span>
        )}
      </label>

      <div className="relative">
        <input
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`h-11 w-full rounded-[10px] border bg-bg-input px-3 font-inter text-base text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-cyan focus-visible:ring-2 focus-visible:ring-accent-cyan xl:h-10 xl:text-[13px] ${
            endAdornment ? 'pr-10' : ''
          } ${error ? 'border-estado-error-text' : 'border-border-subtle'}`}
          {...inputProps}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {endAdornment}
          </div>
        )}
      </div>

      {error && (
        <span id={errorId} className="font-inter text-[11px] text-estado-error-text">
          {error}
        </span>
      )}
    </div>
  )
}
