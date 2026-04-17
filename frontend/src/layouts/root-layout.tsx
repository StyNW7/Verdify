import { useEffect, useRef, useState } from "react";
import SiteHeader from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Outlet, useLocation } from "react-router";
import { AnimatePresence, motion } from "framer-motion";

function RootLayout() {
    const { pathname } = useLocation();
    const footerRef = useRef<HTMLElement | null>(null);
    const [footerHeight, setFooterHeight] = useState(0);

    useEffect(() => {
        const footer = footerRef.current;

        if (!footer) {
            return;
        }

        const updateFooterHeight = () => {
            setFooterHeight(footer.getBoundingClientRect().height);
        };

        updateFooterHeight();

        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", updateFooterHeight);
            return () => window.removeEventListener("resize", updateFooterHeight);
        }

        const resizeObserver = new ResizeObserver(updateFooterHeight);
        resizeObserver.observe(footer);
        window.addEventListener("resize", updateFooterHeight);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateFooterHeight);
        };
    }, []);

    return (
        <div className="min-h-svh bg-background text-foreground">
            <SiteHeader />
            <div className="relative">
                <div
                    className="relative z-10 bg-background"
                    style={footerHeight ? { marginBottom: `${footerHeight}px` } : undefined}
                >
                    <div className="relative flex min-h-svh flex-col">
                        <div className="flex-1 pt-16 md:pt-20">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={pathname}
                                    initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                                    transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
                                >
                                    <Outlet />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
                <Footer ref={footerRef} />
            </div>
        </div>
    );
}

export default RootLayout;
