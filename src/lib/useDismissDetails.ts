import { useEffect, useRef } from "react";

// <details> tabanlı menüleri (tema/dil) menü dışına dokunma, Escape veya ikinci
// bir menünün açılması ile kapatır. Ref'i <details ref={...}> öğesine ver.
export function useDismissDetails() {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = () => {
      if (ref.current?.open) ref.current.open = false;
    };
    const onPointer = (e: Event) => {
      const el = ref.current;
      if (el?.open && e.target instanceof Node && !el.contains(e.target)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return ref;
}
