import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router";

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const firstLoad = useRef(true);

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    const isInitialRun = firstLoad.current;
    firstLoad.current = false;

    if (isInitialRun && !hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    const targetId = hash.replace("#", "");

    if (!targetId) {
      const frame = window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const scrollToElement = (element: HTMLElement) => {
      const navOffset = 72;
      const y = element.getBoundingClientRect().top + window.scrollY - navOffset;
      window.scrollTo({
        top: Math.max(0, y),
        left: 0,
        behavior: isInitialRun ? "auto" : "smooth",
      });
    };

    // The new page may not be in the DOM yet (AnimatePresence mode="wait"
    // holds the incoming route until the outgoing one finishes exiting).
    // Poll on each frame until the element appears, or give up after ~2s.
    let cancelled = false;
    let rafId = 0;
    const deadline = performance.now() + 2000;

    const tryScroll = () => {
      if (cancelled) return;
      const element = document.getElementById(targetId);
      if (element) {
        scrollToElement(element);
        return;
      }
      if (performance.now() < deadline) {
        rafId = window.requestAnimationFrame(tryScroll);
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }
    };

    rafId = window.requestAnimationFrame(tryScroll);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
