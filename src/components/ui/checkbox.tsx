import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, checked, onChange, onCheckedChange, ...props }, ref) => {
    const input = (
      <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={(event) => {
            onChange?.(event)
            onCheckedChange?.(event.target.checked)
          }}
          className={cn(
            'peer h-5 w-5 cursor-pointer appearance-none rounded border border-input bg-background shadow-sm transition-colors checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        <Check className="pointer-events-none absolute h-3.5 w-3.5 text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100" />
      </span>
    )

    if (!label && !description) return input

    return (
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        {input}
        <span className="space-y-1">
          {label ? <span className="block font-medium leading-5">{label}</span> : null}
          {description ? (
            <span className="block text-xs leading-5 text-muted-foreground">{description}</span>
          ) : null}
        </span>
      </label>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
