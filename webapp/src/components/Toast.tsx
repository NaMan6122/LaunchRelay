import { useEffect, useCallback } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastData {
  id: string
  message: string
  variant: ToastVariant
}

interface Props {
  toast: ToastData
  onDismiss: (id: string) => void
}

const icons: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

export default function Toast({ toast, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const handleClick = useCallback(() => onDismiss(toast.id), [toast.id, onDismiss])

  return (
    <div className={`toast toast-${toast.variant}`} onClick={handleClick} role="alert">
      <span className="toast-icon">{icons[toast.variant]}</span>
      <span className="toast-message">{toast.message}</span>
    </div>
  )
}
