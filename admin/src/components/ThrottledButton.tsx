'use client';

import { ButtonHTMLAttributes, useRef } from 'react';

const DEFAULT_COOLDOWN_MS = 800;

type ThrottledButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  throttleMs?: number;
};

export function ThrottledButton({ onClick, throttleMs = DEFAULT_COOLDOWN_MS, disabled, ...rest }: ThrottledButtonProps) {
  const lockedRef = useRef(false);

  return (
    <button
      {...rest}
      disabled={disabled}
      onClick={(e) => {
        if (lockedRef.current || disabled) return;
        lockedRef.current = true;
        onClick?.(e);
        setTimeout(() => {
          lockedRef.current = false;
        }, throttleMs);
      }}
    />
  );
}
