import SiteHeader from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthModalProvider } from "@/components/auth-modal";
import { Outlet, useLocation } from "react-router";
import { AnimatePresence, motion } from "framer-motion";

function RootLayout() {
    const { pathname } = useLocation();

    return (
        <AuthModalProvider>
            <div className="min-h-svh bg-background text-foreground">
                <SiteHeader />
                <div className="flex min-h-svh flex-col">
                    <div className="flex-1 overflow-x-clip">
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, x: 120 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -120 }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                style={{ willChange: "transform, opacity" }}
                            >
                                <Outlet />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                    <Footer />
                </div>
            </div>
        </AuthModalProvider>
    );
}

export default RootLayout;
