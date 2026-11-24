export interface SeoPageConfig {
  title: string;
  description: string;
  keywords?: string;
  canonicalSearch?: string;
  noIndex?: boolean;
}

const upsertMetaTag = (attrName: 'name' | 'property', attrValue: string, content: string) => {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const upsertCanonicalLink = (href: string) => {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

export const applyPageSeo = (config: SeoPageConfig) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const origin = window.location.origin;
  const baseUrl = `${origin}${window.location.pathname}`;
  const canonicalUrl = config.canonicalSearch ? `${baseUrl}${config.canonicalSearch}` : baseUrl;
  const absoluteOgImage = `${origin}/og-share.jpg`;

  document.title = config.title;
  upsertMetaTag('name', 'description', config.description);
  if (config.keywords) {
    upsertMetaTag('name', 'keywords', config.keywords);
  }
  upsertMetaTag(
    'name',
    'robots',
    config.noIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
  );

  upsertCanonicalLink(canonicalUrl);

  upsertMetaTag('property', 'og:url', canonicalUrl);
  upsertMetaTag('property', 'og:title', config.title);
  upsertMetaTag('property', 'og:description', config.description);
  upsertMetaTag('property', 'og:image', absoluteOgImage);

  upsertMetaTag('name', 'twitter:title', config.title);
  upsertMetaTag('name', 'twitter:description', config.description);
  upsertMetaTag('name', 'twitter:image', absoluteOgImage);
};
