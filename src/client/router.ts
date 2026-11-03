import { useState, useEffect } from 'react';

export type TabId =
  | 'overview'
  | 'rooms-tenants'
  | 'billing'
  | 'operations'
  | 'staff'
  | 'plan';

export const TAB_TO_PATH: Record<TabId, string> = {
  overview: '/dashboard',
  'rooms-tenants': '/kamar',
  billing: '/tagihan',
  operations: '/kas',
  staff: '/penjaga',
  plan: '/paket',
};

export const PATH_TO_TAB: Record<string, TabId> = {
  '/dashboard': 'overview',
  '/beranda': 'overview',
  '/overview': 'overview',
  '/kamar': 'rooms-tenants',
  '/rooms': 'rooms-tenants',
  '/rooms-tenants': 'rooms-tenants',
  '/tagihan': 'billing',
  '/billing': 'billing',
  '/invoices': 'billing',
  '/kas': 'operations',
  '/operasional': 'operations',
  '/operations': 'operations',
  '/penjaga': 'staff',
  '/staff': 'staff',
  '/paket': 'plan',
  '/cabang': 'plan',
  '/plan': 'plan',
};

export type PublicRoute = {
  type: 'invoice' | 'complaint' | 'catalog';
  param: string;
};

export type ParsedRoute =
  | { kind: 'public'; route: PublicRoute }
  | { kind: 'auth'; mode: 'login' | 'register'; redirect?: string }
  | { kind: 'dashboard'; tab: TabId }
  | { kind: 'landing' };

export function parseRoute(
  pathname: string = window.location.pathname,
  search: string = window.location.search,
  hasToken: boolean = false
): ParsedRoute {
  // 1. Public Routes: /inv/:token, /lapor/:slug, /kos/:slug
  const invMatch = pathname.match(/^\/inv\/([^/]+)/);
  if (invMatch) {
    return { kind: 'public', route: { type: 'invoice', param: invMatch[1] } };
  }

  const laporMatch = pathname.match(/^\/lapor\/([^/]+)/);
  if (laporMatch) {
    return { kind: 'public', route: { type: 'complaint', param: laporMatch[1] } };
  }

  const kosMatch = pathname.match(/^\/kos\/([^/]+)/);
  if (kosMatch) {
    return { kind: 'public', route: { type: 'catalog', param: kosMatch[1] } };
  }

  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(search);
  const redirectParam = searchParams.get('redirect') || undefined;

  // 2. Auth Routes: /login, /register
  if (cleanPath === '/login') {
    return { kind: 'auth', mode: 'login', redirect: redirectParam };
  }
  if (cleanPath === '/register') {
    return { kind: 'auth', mode: 'register', redirect: redirectParam };
  }

  // 3. Dashboard Tab Routes: /dashboard, /kamar, /tagihan, /kas, /penjaga, /paket, etc.
  const matchedTab = PATH_TO_TAB[cleanPath];
  if (matchedTab) {
    if (hasToken) {
      return { kind: 'dashboard', tab: matchedTab };
    }
    // Protected route: unauthenticated access directs to login with redirect param
    return { kind: 'auth', mode: 'login', redirect: cleanPath };
  }

  // 4. Root / Home
  if (cleanPath === '/') {
    if (hasToken) {
      return { kind: 'dashboard', tab: 'overview' };
    }
    return { kind: 'landing' };
  }

  // 5. Fallback for unrecognized paths
  if (hasToken) {
    return { kind: 'dashboard', tab: 'overview' };
  }
  return { kind: 'landing' };
}

export function navigate(to: string, options?: { replace?: boolean }) {
  if (options?.replace) {
    window.history.replaceState({}, '', to);
  } else {
    window.history.pushState({}, '', to);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useLocationRoute(hasToken: boolean) {
  const [location, setLocation] = useState(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
  }));

  useEffect(() => {
    const handlePopState = () => {
      setLocation({
        pathname: window.location.pathname,
        search: window.location.search,
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const parsed = parseRoute(location.pathname, location.search, hasToken);

  return {
    pathname: location.pathname,
    search: location.search,
    parsed,
    navigate,
  };
}
