import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
  noindex?: boolean;
}

export const SEO: React.FC<SEOProps> = ({
  title = 'AI Examentrainer | Oefen voor je VMBO, HAVO & VWO Eindexamen met AI',
  description = 'Behaal hogere cijfers met de AI Examentrainer. Oefen voor je eindexamen met AI-gegenereerde vragen, flashcards en persoonlijke begeleiding voor VMBO, HAVO en VWO.',
  keywords = 'eindexamen, examentraining, AI examentrainer, VMBO, HAVO, VWO, examens oefenen, studie hulp, leren, schoolexamens, AI leren, persoonlijke begeleiding',
  ogImage = 'https://ai-examentrainer.nl/og-image.png',
  ogType = 'website',
  canonical,
  noindex = false,
}) => {
  const fullTitle = title.includes('AI Examentrainer') ? title : `${title} | AI Examentrainer`;
  // Check if window is available (client-side) to prevent SSR crash
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const currentUrl = canonical || `https://ai-examentrainer.nl${pathname}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Canonical URL */}
      <link rel="canonical" href={currentUrl} />

      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="AI Examentrainer" />
      <meta property="og:locale" content="nl_NL" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};
