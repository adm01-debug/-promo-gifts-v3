import { Helmet } from "react-helmet-async";

interface PageSEOProps {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
}

const BASE_URL = "https://criar-together-now.lovable.app";
const SITE_NAME = "Promo Gifts";
const DEFAULT_DESC = "Plataforma completa para vendedores de brindes promocionais. Catálogo, orçamentos, simulador de preços e muito mais.";

export function PageSEO({ title, description, path, noIndex }: PageSEOProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const desc = description || DEFAULT_DESC;
  const url = path ? `${BASE_URL}${path}` : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      {url && <meta property="og:url" content={url} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />

      {url && <link rel="canonical" href={url} />}
    </Helmet>
  );
}
