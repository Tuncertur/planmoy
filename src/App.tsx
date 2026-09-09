import { useSession } from "./lib/useSession";
import { isSupabaseConfigured } from "./lib/supabase";
import { AuthScreen } from "./screens/AuthScreen";
import { Dashboard } from "./screens/Dashboard";
import { ConfigMissingScreen } from "./screens/ConfigMissingScreen";

function App() {
  const { session, loading } = useSession();

  if (!isSupabaseConfigured) return <ConfigMissingScreen />;
  if (loading) return null;
  if (!session) return <AuthScreen />;
  return <Dashboard userId={session.user.id} />;
}

export default App;
