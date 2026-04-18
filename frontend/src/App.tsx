import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";

import Layout from "@/layouts/root-layout";

import ScrollToTop from "./utility/ScrollToTop";
import ScrollToTopFunction from "./utility/ScrollToTopFunction";
import NotFoundPage from "./pages/Utility/NotFound404";
import RegisterPage from "./pages/Auth/register";
import LandingPage from "@/pages/Landing/page";
import LoginPage from "./pages/Auth/login";
import AuthLayout from "./pages/Auth/layout";
import RoutePlannerPage from "./pages/Route/page";

function App() {
  return (
    <BrowserRouter>
      <ScrollToTopFunction />
      <ScrollToTop />

      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<LandingPage />} />
            <Route path="/route" element={<RoutePlannerPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route
            path="/auth/login"
            element={
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            }
          />
          <Route
            path="/auth/register"
            element={
              <AuthLayout>
                <RegisterPage />
              </AuthLayout>
            }
          />
        </Routes>
      </AnimatePresence>

      <Toaster position="top-center" />
    </BrowserRouter>
  );
}

export default App;
