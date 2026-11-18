import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSeoForPath } from '../lib/seo';

function upsertMeta(attrName: 'name' | 'property', attrValue: string, content: string) {
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function SeoHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = getSeoForPath(pathname);
    const origin = window.location.origin;
    const canonicalUrl = meta.path === '/' ? `${origin}/` : `${origin}${meta.path}`;

    document.title = meta.title;
    upsertMeta('name', 'description', meta.description);
    upsertMeta('property', 'og:title', meta.title);
    upsertMeta('property', 'og:description', meta.description);
    upsertMeta('name', 'twitter:title', meta.title);
    upsertMeta('name', 'twitter:description', meta.description);
    upsertMeta(
      'name',
      'robots',
      meta.indexable ? 'index, follow' : 'noindex, nofollow'
    );

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (meta.indexable) {
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', canonicalUrl);
      upsertMeta('property', 'og:url', canonicalUrl);
    } else if (canonical) {
      canonical.remove();
    }

    const ldId = 'tomoyo-org-jsonld';
    let script = document.getElementById(ldId) as HTMLScriptElement | null;
    if (meta.indexable) {
      if (!script) {
        script = document.createElement('script');
        script.id = ldId;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'EducationalOrganization',
        name: 'TOMOYO PRIVAT & BIMBEL EDUCATION',
        description:
          'Tempat tumbuhnya generasi cerdas, mandiri, berprestasi, dan siap meraih masa depan.',
        url: origin,
        email: 'tomoyoeducation.com@gmail.com',
        telephone: '+6282119770700',
        sameAs: [
          'https://www.instagram.com/tomoyoeducation?bqrl=cHJsb3RnY3g1c3g2',
          'https://www.facebook.com/share/1CSomr9gXK/',
        ],
      });
    } else if (script) {
      script.remove();
    }
  }, [pathname]);

  return null;
}
