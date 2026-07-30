import React, { useEffect } from 'react';

type SeoHeadProps = {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  keywords?: string[];
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const ensureMetaTag = (selector: string, attrs: Record<string, string>) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attrs).forEach(([key, value]) => element?.setAttribute(key, value));
    document.head.appendChild(element);
  }
  return element;
};

const ensureLinkTag = (selector: string, attrs: Record<string, string>) => {
  let element = document.head.querySelector(selector) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    Object.entries(attrs).forEach(([key, value]) => element?.setAttribute(key, value));
    document.head.appendChild(element);
  }
  return element;
};

const absoluteUrl = (value?: string) => {
  if (!value) return window.location.href;
  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return window.location.href;
  }
};

export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  image,
  url,
  type = 'website',
  keywords = [],
  publishedTime,
  modifiedTime,
  author,
  jsonLd,
}) => {
  useEffect(() => {
    const previousTitle = document.title;
    const canonicalUrl = absoluteUrl(url);
    const imageUrl = image ? absoluteUrl(image) : '';
    const fullTitle = title.includes('Blu') ? title : `${title} | Blu Tecnologias`;

    document.title = fullTitle;

    const descriptionMeta = ensureMetaTag('meta[name="description"]', { name: 'description' });
    descriptionMeta.setAttribute('content', description);

    const keywordsMeta = ensureMetaTag('meta[name="keywords"]', { name: 'keywords' });
    keywordsMeta.setAttribute('content', keywords.join(', '));

    const robotsMeta = ensureMetaTag('meta[name="robots"]', { name: 'robots' });
    robotsMeta.setAttribute('content', 'index, follow, max-image-preview:large');

    const canonicalLink = ensureLinkTag('link[rel="canonical"]', { rel: 'canonical' });
    canonicalLink.setAttribute('href', canonicalUrl);

    const openGraphTags: Array<[string, string]> = [
      ['og:title', fullTitle],
      ['og:description', description],
      ['og:type', type],
      ['og:url', canonicalUrl],
      ['og:site_name', 'Blu Tecnologias'],
      ['og:locale', 'pt_BR'],
    ];

    if (imageUrl) openGraphTags.push(['og:image', imageUrl]);
    if (publishedTime) openGraphTags.push(['article:published_time', publishedTime]);
    if (modifiedTime) openGraphTags.push(['article:modified_time', modifiedTime]);
    if (author) openGraphTags.push(['article:author', author]);

    openGraphTags.forEach(([property, content]) => {
      const tag = ensureMetaTag(`meta[property="${property}"]`, { property });
      tag.setAttribute('content', content);
    });

    const twitterTags: Array<[string, string]> = [
      ['twitter:card', imageUrl ? 'summary_large_image' : 'summary'],
      ['twitter:title', fullTitle],
      ['twitter:description', description],
    ];

    if (imageUrl) twitterTags.push(['twitter:image', imageUrl]);

    twitterTags.forEach(([name, content]) => {
      const tag = ensureMetaTag(`meta[name="${name}"]`, { name });
      tag.setAttribute('content', content);
    });

    let jsonLdScript: HTMLScriptElement | null = null;
    if (jsonLd) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.type = 'application/ld+json';
      jsonLdScript.dataset.seo = 'blu';
      jsonLdScript.text = JSON.stringify(jsonLd);
      document.head.appendChild(jsonLdScript);
    }

    return () => {
      document.title = previousTitle;
      if (jsonLdScript?.parentNode) jsonLdScript.parentNode.removeChild(jsonLdScript);
    };
  }, [title, description, image, url, type, keywords, publishedTime, modifiedTime, author, jsonLd]);

  return null;
};

