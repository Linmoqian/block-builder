import { useState, useRef } from 'react';

export function useToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToastMessage(message);
    timerRef.current = setTimeout(() => setToastMessage(null), 3000);
  };

  return { toastMessage, showToast };
}
