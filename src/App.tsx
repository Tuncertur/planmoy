import { useState } from "react";
import { useSession } from "./lib/useSession";
import { isSupabaseConfigured } from "./lib/supabase";
import { AuthScreen } from "./screens/AuthScreen";
import { Dashboard } from "./screens/Dashboard";
import { ConfigMissingScreen } from "./screens/ConfigMissingScreen";
import { LegalScreen } from "./screens/LegalScreen";
import { CookieConsent } from "./components/CookieConsent";

function App() {
  const { session, loading } = useSession();
  const [showLegal, setShowLegal] = useState(false);

  if (!isSupabaseConfigured) return <ConfigMissingScreen />;
  if (loading) return null;

  if (showLegal) return <LegalScreen onBack={() => setShowLegal(false)} />;

  return (
    <>
      {!session ? <AuthScreen onOpenLegal={() => setShowLegal(true)} /> : <Dashboard userId={session.user.id} />}
      <CookieConsent />
    </>
  );
}

export default App;
