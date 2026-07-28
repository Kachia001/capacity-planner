import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 aria-invalid:ring-3 active:not-aria-[haspopup]:translate-y-px [&_svg:not([class*=size-])]:size-4 group/button inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap transition-all outline-none select-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--button-bg)] text-[var(--button-foreground)] hover:bg-[var(--button-hover)]',
        solid:
          'bg-[var(--button-bg)] text-[var(--button-foreground)] hover:bg-[var(--button-hover)]',
        outline:
          'border-[var(--button-border)] bg-background text-[var(--button-outline)] hover:bg-[var(--button-soft)] hover:text-[var(--button-outline)]',
        soft: 'bg-[var(--button-soft)] text-[var(--button-outline)] hover:bg-[var(--button-soft-hover)]',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'text-[var(--button-outline)] hover:bg-[var(--button-soft)] hover:text-[var(--button-outline)] aria-expanded:bg-[var(--button-soft)]',
        destructive:
          'bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30',
        link: 'text-[var(--button-outline)] underline-offset-4 hover:underline',
      },
      tone: {
        neutral:
          '[--button-bg:var(--action-neutral)] [--button-hover:var(--action-neutral-hover)] [--button-foreground:var(--action-neutral-foreground)] [--button-soft:var(--action-neutral-soft)] [--button-soft-hover:var(--action-neutral-soft-hover)] [--button-border:var(--action-neutral-border)] [--button-outline:var(--action-neutral-outline)]',
        brand:
          '[--button-bg:var(--action-brand)] [--button-hover:var(--action-brand-hover)] [--button-foreground:var(--action-brand-foreground)] [--button-soft:var(--action-brand-soft)] [--button-soft-hover:var(--action-brand-soft-hover)] [--button-border:var(--action-brand-border)] [--button-outline:var(--action-brand-outline)]',
        success:
          '[--button-bg:var(--action-success)] [--button-hover:var(--action-success-hover)] [--button-foreground:var(--action-success-foreground)] [--button-soft:var(--action-success-soft)] [--button-soft-hover:var(--action-success-soft-hover)] [--button-border:var(--action-success-border)] [--button-outline:var(--action-success-outline)]',
        warning:
          '[--button-bg:var(--action-warning)] [--button-hover:var(--action-warning-hover)] [--button-foreground:var(--action-warning-foreground)] [--button-soft:var(--action-warning-soft)] [--button-soft-hover:var(--action-warning-soft-hover)] [--button-border:var(--action-warning-border)] [--button-outline:var(--action-warning-outline)]',
        danger:
          '[--button-bg:var(--action-danger)] [--button-hover:var(--action-danger-hover)] [--button-foreground:var(--action-danger-foreground)] [--button-soft:var(--action-danger-soft)] [--button-soft-hover:var(--action-danger-soft-hover)] [--button-border:var(--action-danger-border)] [--button-outline:var(--action-danger-outline)]',
      },
      size: {
        default:
          'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: 'h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*=size-])]:size-3',
        sm: 'h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*=size-])]:size-3.5',
        md: 'h-10 gap-2 px-4',
        lg: 'h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        touch: 'h-12 gap-2 px-4 text-sm',
        icon: 'size-8',
        'icon-xs':
          'size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*=size-])]:size-3',
        'icon-sm':
          'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        'icon-md': 'size-10',
        'icon-lg': 'size-9',
        'icon-touch': 'size-12',
        content: 'h-auto gap-0 p-0',
      },
      shape: {
        default: 'rounded-lg',
        compact: 'rounded-sm',
        pill: 'rounded-full',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      tone: 'neutral',
      size: 'default',
      shape: 'default',
      fullWidth: false,
    },
  },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>
