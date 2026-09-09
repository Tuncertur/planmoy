import { useSession } from "./lib/useSession";
import { AuthScreen } from "./screens/AuthScreen";
import { Dashboard } from "./screens/Dashboard";

function App() {
  const { session, loading } = useSession();

  if (loading) return null;
  if (!session) return <AuthScreen />;
  return <Dashboard userId={session.user.id} />;
}

export default App;
