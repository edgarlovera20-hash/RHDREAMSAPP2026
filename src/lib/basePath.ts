export const getAppBasePath = () => {
  if (typeof window === "undefined") return "";

  const configured = ((import.meta as any).env?.VITE_APP_BASE_PATH as string | undefined) || "";
  if (configured && configured !== "/") {
    return configured.endsWith("/") ? configured.slice(0, -1) : configured;
  }

  return window.location.pathname === "/rh" || window.location.pathname.startsWith("/rh/")
    ? "/rh"
    : "";
};

export const appUrl = (path: string) => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getAppBasePath()}${normalized}`;
};
