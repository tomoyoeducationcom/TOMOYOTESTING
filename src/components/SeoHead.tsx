import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  TOMOYO_APK_BANNER_PNG,
  TOMOYO_APK_SEO,
  buildDownloadApkStructuredData,
} from '../lib/apkDownload';
import { buildOrganizationJsonLd, getSeoForPath } from '../lib/seo';

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
    const isApkRoute = meta.path === TOMOYO_APK_SEO.path;
    const ogImageUrl = isApkRoute
      ? `${origin}${TOMOYO_APK_BANNER_PNG}`
      : `${origin}/assets/aistudio/favicon_67ba3fe5.png`;

    document.title = meta.title;
    upsertMeta('name', 'description', meta.description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'TOMOYO PRIVAT & BIMBEL EDUCATION');
    upsertMeta('property', 'og:title', meta.title);
    upsertMeta('property', 'og:description', meta.description);
    upsertMeta('property', 'og:image', ogImageUrl);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', meta.title);
    upsertMeta('name', 'twitter:description', meta.description);
    upsertMeta('name', 'twitter:image', ogImageUrl);
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
      script.textContent = JSON.stringify(
        isApkRoute ? buildDownloadApkStructuredData(origin) : buildOrganizationJsonLd(origin)
      );
    } else if (script) {
      script.remove();
    }
  }, [pathname]);

  return null;
}
