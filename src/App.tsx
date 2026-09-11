import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useSession } from "./lib/useSession";
import { isSupabaseConfigured } from "./lib/supabase";
import { AuthScreen } from "./screens/AuthScreen";
import { Dashboard } from "./screens/Dashboard";
import { ConfigMissingScreen } from "./screens/ConfigMissingScreen";
import { LegalScreen } from "./screens/LegalScreen";
import { CookieConsent } from "./components/CookieConsent";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { EventRsvpScreen } from "./screens/EventRsvpScreen";
import { PublicBookingScreen } from "./screens/PublicBookingScreen";
import { ProfileViewScreen } from "./screens/ProfileViewScreen";

function MainApp() {
  const { session, loading } = useSession();
  const [showLegal, setShowLegal] = useState(false);

  if (loading) return null;
  if (showLegal) return <LegalScreen onBack={() => setShowLegal(false)} />;

  return !session ? (
    <AuthScreen onOpenLegal={() => setShowLegal(true)} />
  ) : (
    <Dashboard userId={session.user.id} email={session.user.email ?? ""} />
  );
}

function App() {
  if (!isSupabaseConfigured) return <ConfigMissingScreen />;

  return (
    <BrowserRouter>
      <ThemeSwitcher />
      <Routes>
        <Route path="/events/:token" element={<EventRsvpScreen />} />
        <Route path="/book/:slug" element={<PublicBookingScreen />} />
        <Route path="/profile/:token" element={<ProfileViewScreen />} />
        <Route path="/*" element={<MainApp />} />
      </Routes>
      <CookieConsent />
    </BrowserRouter>
  );
}

export default App;
