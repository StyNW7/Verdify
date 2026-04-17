import SiteHeader from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Outlet, useLocation } from "react-router";
import { AnimatePresence, motion } from "framer-motion";

function RootLayout() {
    const { pathname } = useLocation();
    return (
        <div className="min-h-svh bg-background text-foreground">
            <SiteHeader />
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
                <Footer />
            </div>
        </div>
    );
}

export default RootLayout;
