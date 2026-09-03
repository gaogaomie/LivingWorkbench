import { useEffect, useId, useRef } from "react";
import { NavLink } from "react-router-dom";
import { dataNavigation, primaryNavigation } from "../constants/route-paths";
import { useUiStore } from "../stores/ui.store";

export function MobileNavigation() {
  const isOpen = useUiStore((state) => state.mobileDrawerOpen);
  const setOpen = useUiStore((state) => state.setMobileDrawerOpen);
  const items = [...primaryNavigation, ...dataNavigation];
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, setOpen]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className="min-h-11 rounded-xl border border-island-border bg-island-surface px-4 font-bold hover:bg-island-active focus-visible:ring-2"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setOpen(!isOpen)}
      >
        {isOpen ? "关闭" : "菜单"}
      </button>
      {isOpen ? (
        <nav
          id={menuId}
          className="absolute left-0 top-13 z-20 w-[min(280px,80vw)] rounded-2xl border border-island-border bg-island-surface p-3 shadow-island"
          aria-label="移动端导航"
        >
          {items.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `block min-h-11 rounded-xl px-3 py-2.5 hover:bg-island-active focus-visible:ring-2 ${
                  isActive ? "bg-island-active font-bold" : ""
                }`
              }
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
