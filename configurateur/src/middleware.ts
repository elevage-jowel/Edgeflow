import { NextResponse, type NextRequest } from 'next/server';
import { sessionCookie, verifySessionValue } from '@/lib/auth';

/** URL néerlandaises → dossiers internes (français). */
const NL_TO_FR: Record<string, string> = {
  tractoren: 'tracteurs',
  configurator: 'configurateur',
  offerte: 'devis',
  'mijn-offertes': 'mes-devis',
  privacy: 'confidentialite',
  voorwaarden: 'conditions',
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next();
    const ok = await verifySessionValue(req.cookies.get(sessionCookie.name)?.value);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname === '/') {
    const lang = req.headers.get('accept-language') ?? '';
    const nl = /^nl\b|,\s*nl\b/i.test(lang) && !/^fr/i.test(lang);
    return NextResponse.redirect(new URL(nl ? '/nl' : '/fr', req.url));
  }

  const parts = pathname.split('/');
  if (parts[1] === 'nl' && parts[2] && NL_TO_FR[parts[2]]) {
    const url = req.nextUrl.clone();
    parts[2] = NL_TO_FR[parts[2]];
    url.pathname = parts.join('/');
    return NextResponse.rewrite(url);
  }
  // Les URL françaises sous /nl redirigent vers leur version néerlandaise (une seule URL par page).
  if (parts[1] === 'nl' && parts[2]) {
    const back = Object.entries(NL_TO_FR).find(([, fr]) => fr === parts[2]);
    if (back) {
      parts[2] = back[0];
      return NextResponse.redirect(new URL(parts.join('/') + req.nextUrl.search, req.url), 308);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|uploads|brand|favicon|icon|apple-icon|robots.txt|sitemap.xml|.*\\.[a-z0-9]+$).*)'],
};
