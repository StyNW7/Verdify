import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const firstLoad = useRef(true);

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      navigate(window.location.pathname, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    const targetId = hash.replace("#", "");
    const scroll = () => {
      if (targetId) {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    };

    const frame = window.requestAnimationFrame(scroll);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
