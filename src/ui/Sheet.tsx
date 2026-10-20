import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './Button'

interface SheetProps {
  open: boolean
  title: ReactNode
  onClose: () => void
  closeLabel: string
  children: ReactNode
}

/** Bottom sheet on phones, centered dialog on wide screens. */
export function Sheet({ open, title, onClose, closeLabel, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 mt-auto w-full max-w-none rounded-t-card bg-surface p-0 text-text shadow-card backdrop:bg-black/40 sm:m-auto sm:max-w-lg sm:rounded-card"
    >
      <div className="safe-bottom flex max-h-[85dvh] flex-col">
        <div className="flex items-center justify-between gap-2 px-5 pt-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <IconButton label={closeLabel} onClick={onClose}>
            <X size={22} />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 pb-2">{children}</div>
      </div>
    </dialog>
  )
}
