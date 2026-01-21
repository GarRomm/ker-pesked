export function getCacheHeaders(maxAge: number = 300) {
  return {
    'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
    'CDN-Cache-Control': `public, s-maxage=${maxAge}`,
    'Vercel-CDN-Cache-Control': `public, s-maxage=${maxAge}`
  };
}

export function getNoCacheHeaders() {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
}

// Durées de cache recommandées
export const CACHE_TIMES = {
  SHORT: 60,        // 1 minute - données changeantes (orders, dashboard)
  MEDIUM: 300,      // 5 minutes - données modérément stables (products)
  LONG: 3600,       // 1 heure - données stables (customers, suppliers)
  VERY_LONG: 86400  // 24 heures - données très stables (stats historiques)
};
