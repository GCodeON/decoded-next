import { useCallback, useState } from 'react';

export type Toast = {
  message: string;
  duration: number;
};

export function useToast(defaultDuration: number = 3000) {
  const [toast, setToastState] = useState<Toast | null>(null);

  const show = useCallback(
    (message: string, duration: number = defaultDuration) => {
      setToastState(null);

      setToastState({ message, duration });

      const timeout = setTimeout(() => {
        setToastState(null);
      }, duration);

      return () => clearTimeout(timeout);
    },
    [defaultDuration]
  );

  const hide = useCallback(() => {
    setToastState(null);
  }, []);

  return {
    toast,
    show,
    hide,
  };
}
