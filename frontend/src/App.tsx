import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { APIProvider } from "@vis.gl/react-google-maps";

import Layout from "@/layouts/root-layout";
import AuthedLayout from "@/layouts/authed-layout";
import { LoadingScreen } from "@/components/loading-screen";
import { NavHistoryTracker } from "@/utility/nav-history";
import { AuthProvider } from "@/lib/auth-provider";

import ScrollToTop from "./utility/ScrollToTop";
import ScrollToTopFunction from "./utility/ScrollToTopFunction";
import NotFoundPage from "./pages/Utility/NotFound404";
import RegisterPage from "./pages/Auth/register";
import LandingPage from "@/pages/Landing/page";
import LoginPage from "./pages/Auth/login";
import AuthLayout from "./pages/Auth/layout";
import RoutePlannerPage from "./pages/Route/page";
import DashboardPage from "./pages/Dashboard/page";
import ProfilePage from "./pages/Profile/page";
import LeaderboardPage from "./pages/Leaderboard/page";
import HistoryPage from "./pages/History/page";
import RewardsPage from "./pages/Rewards/page";
import TechnologyPage from "./pages/Technology/page";
import AboutPage from "./pages/About/page";

const INTRO_KEY = "verdify:intro-seen";

function App() {
  const [introDone, setIntroDone] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.sessionStorage.getItem(INTRO_KEY) === "1";
  });

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

  return (
    <APIProvider apiKey={googleMapsApiKey}>
    <AuthProvider>
    <BrowserRouter>
      {!introDone && (
        <LoadingScreen
          variant="intro"
          onDone={() => {
            window.sessionStorage.setItem(INTRO_KEY, "1");
            setIntroDone(true);
          }}
        />
      )}

      <NavHistoryTracker />
      <ScrollToTopFunction />
      <ScrollToTop />

      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<LandingPage />} />
            <Route path="technology" element={<TechnologyPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route element={<AuthedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/route" element={<RoutePlannerPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/rewards" element={<RewardsPage />} />
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
    </AuthProvider>
    </APIProvider>
  );
}

export default App;
