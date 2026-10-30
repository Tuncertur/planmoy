import { Component, type ErrorInfo, type ReactNode } from "react";

// Render sırasında yakalanmayan bir hata React kökünü söker ve kullanıcı sonsuz boş ekran görür.
// Bu sınır, uygulamayı tamamen çökertmek yerine anlaşılır bir ekran ve "Yeniden dene" düğmesi gösterir.
// Kasıtlı olarak bağımsızdır: i18n, depolama ya da diğer modüllere dayanmaz.
type State = { failed: boolean };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[planmoy] render hatasi", error.message, info.componentStack?.slice(0, 300));
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const tr = (typeof navigator !== "undefined" ? navigator.language : "tr").toLowerCase().startsWith("tr");
    return (
      <div role="alert" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>{tr ? "Bir şeyler ters gitti" : "Something went wrong"}</p>
          <p style={{ margin: "0 0 16px", opacity: 0.75 }}>{tr ? "Uygulamayı yeniden başlatmayı dene." : "Please try reloading the app."}</p>
          <button onClick={() => window.location.reload()} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid currentColor", background: "transparent", color: "inherit", fontSize: 16 }}>
            {tr ? "Yeniden dene" : "Try again"}
          </button>
        </div>
      </div>
    );
  }
}
