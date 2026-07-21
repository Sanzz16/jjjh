'use client';

import { useCallback, useRef, useState } from 'react';

const DURATION_SECONDS = 60;

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
}

// Mirrors index.html's SanzPayment module: a universal 60s countdown that
// starts/restarts whenever a payment method is selected, and blocks
// checkout submission once expired.
export function usePaymentTimer() {
  const [remaining, setRemaining] = useState(DURATION_SECONDS);
  const [expired, setExpired] = useState(false);
  const [active, setActive] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const intervalRef = useRef(null);

  const stopPaymentTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setExpired(false);
    setRemaining(DURATION_SECONDS);
    setActive(false);
    setMinimized(false);
  }, []);

  const startPaymentTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRemaining(DURATION_SECONDS);
    setExpired(false);
    setActive(true);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const isExpired = useCallback(() => expired, [expired]);
  const toggleMinimize = useCallback(() => setMinimized((v) => !v), []);

  const pct = Math.max(0, (remaining / DURATION_SECONDS) * 100);

  return {
    active,
    expired,
    minimized,
    display: formatTime(Math.max(0, remaining)),
    barWidth: `${pct}%`,
    barColor: pct <= 20 ? '#f87171' : '#ffffff',
    startPaymentTimer,
    stopPaymentTimer,
    isExpired,
    toggleMinimize,
  };
}
