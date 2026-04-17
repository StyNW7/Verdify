import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";

import Layout from "@/layouts/root-layout";

import ScrollToTop from "./utility/ScrollToTop";
import ScrollToTopFunction from "./utility/ScrollToTopFunction";
import NotFoundPage from "./pages/Utility/NotFound404";

import LandingPage from "@/pages/Landing/page";
import AboutPage from "./pages/About/page";

function App() {
  return (
    <BrowserRouter>
      <ScrollToTopFunction />
      <ScrollToTop />

      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<LandingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AnimatePresence>

      <Toaster position="top-center" />
    </BrowserRouter>
  );
}

export default App;
