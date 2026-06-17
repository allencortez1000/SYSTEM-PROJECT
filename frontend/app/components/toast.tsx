"use client";

import { useEffect } from 'react';

type Props = {
  message: string | null;
  onClose?: () => void;
};

export default function Toast({ message, onClose }: Props) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose && onClose(), 3500);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="rounded-md bg-emerald-600 px-4 py-2 text-white shadow">{message}</div>
    </div>
  );
}
