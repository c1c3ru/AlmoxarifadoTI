import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  isMobile: boolean;
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  setCollapsed: (collapsed: boolean) => void;
}
type Layout = "mobile" | "compact" | "expanded";
function getLayout(): Layout {
  if (typeof window === "undefined") return "expanded";
  if (window.matchMedia("(max-width: 1023px)").matches) return "mobile";
  return window.matchMedia("(max-width: 1279px)").matches ? "compact" : "expanded";
}
const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [layout, setLayout] = useState<Layout>(getLayout);
  const [desktopPreference, setDesktopPreference] = useState<boolean | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = layout === "mobile";
  const isCollapsed = !isMobile && (desktopPreference ?? layout === "compact");

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 1023px)");
    const compact = window.matchMedia("(max-width: 1279px)");
    const update = () => {
      setLayout(getLayout());
      if (!mobile.matches) setIsOpen(false);
    };
    mobile.addEventListener("change", update);
    compact.addEventListener("change", update);
    return () => {
      mobile.removeEventListener("change", update);
      compact.removeEventListener("change", update);
    };
  }, []);

  const toggle = () => isMobile ? setIsOpen((value) => !value) : setDesktopPreference(!isCollapsed);
  const open = () => isMobile ? setIsOpen(true) : setDesktopPreference(false);
  const close = () => isMobile ? setIsOpen(false) : setDesktopPreference(true);
  const setCollapsed = (value: boolean) => { if (!isMobile) setDesktopPreference(value); };

  return <SidebarContext.Provider value={{ isCollapsed, isMobile, isOpen, toggle, open, close, setCollapsed }}>{children}</SidebarContext.Provider>;
}
export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider");
  return context;
}
