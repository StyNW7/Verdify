'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { flushSync } from 'react-dom';

type Props = {
  className?: string;
  onToggleComplete?: (newTheme: 'dark' | 'light') => void;
};

export function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const read = () => setIsDark(document.documentElement.classList.contains('dark'));
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

export default function AnimatedThemeToggler({ className = '', onToggleComplete }: Props) {
  const [isDark, setIsDark] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = saved === 'dark' || (!saved && prefersDark);
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);

    const update = () => setIsDark(document.documentElement.classList.contains('dark'));
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const createFallbackAnimation = useCallback(
    (x: number, y: number) =>
      new Promise<void>((resolve) => {
        if (!overlayRef.current || !buttonRef.current) return resolve();
        const overlay = overlayRef.current;
        const button = buttonRef.current;
        const maxRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y),
        );

        button.style.opacity = '0';
        button.style.transform = 'scale(0.9)';
        button.style.transition = 'all 0.15s ease-out';

        overlay.style.display = 'block';
        overlay.style.left = `${x}px`;
        overlay.style.top = `${y}px`;
        overlay.style.width = `${maxRadius * 2}px`;
        overlay.style.height = `${maxRadius * 2}px`;
        overlay.style.borderRadius = '50%';
        overlay.style.backgroundColor = isDark ? '#F4F5F0' : '#0A0E0C';
        overlay.style.position = 'fixed';
        overlay.style.transform = 'translate(-50%, -50%) scale(0)';
        overlay.style.transition = 'none';
        overlay.style.zIndex = '9999';
        overlay.style.pointerEvents = 'none';
        overlay.style.opacity = '1';
        overlay.getBoundingClientRect();

        overlay.style.transition = 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
        overlay.style.transform = 'translate(-50%, -50%) scale(1)';

        setTimeout(() => {
          const next = !isDark;
          setIsDark(next);
          document.documentElement.classList.toggle('dark', next);
          localStorage.setItem('theme', next ? 'dark' : 'light');

          overlay.style.transition = 'opacity 0.3s ease-out';
          overlay.style.opacity = '0';

          setTimeout(() => {
            overlay.style.display = 'none';
            overlay.style.opacity = '1';
            overlay.style.transition = '';
            button.style.opacity = '1';
            button.style.transform = 'scale(1)';
            button.style.transition = 'all 0.2s ease-out';
            setTimeout(() => {
              button.style.opacity = '';
              button.style.transform = '';
              button.style.transition = '';
              setIsAnimating(false);
              onToggleComplete?.(next ? 'dark' : 'light');
              resolve();
            }, 200);
          }, 300);
        }, 700);
      }),
    [isDark, onToggleComplete],
  );

  const toggle = useCallback(async () => {
    if (!buttonRef.current || isAnimating) return;
    setIsAnimating(true);

    const { top, left, width, height } = buttonRef.current.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;

    if (!document.startViewTransition) {
      await createFallbackAnimation(x, y);
      setIsAnimating(false);
      return;
    }

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        const next = !isDark;
        setIsDark(next);
        document.documentElement.classList.toggle('dark', next);
        localStorage.setItem('theme', next ? 'dark' : 'light');
      });
    });

    await transition.ready;
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );
    const anim = document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 700,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      },
    );
    try {
      await anim.finished;
    } catch {}
    setIsAnimating(false);
    onToggleComplete?.(isDark ? 'light' : 'dark');
  }, [isDark, isAnimating, createFallbackAnimation, onToggleComplete]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        disabled={isAnimating}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        className={`${className} relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 disabled:opacity-50`}
        style={{ color: 'currentColor' }}
      >
        <div className={`transition-all duration-300 ${isAnimating ? 'scale-110' : 'scale-100'}`}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </div>
      </button>

      <div
        ref={overlayRef}
        style={{ position: 'fixed', display: 'none', pointerEvents: 'none' }}
      />
    </>
  );
}
