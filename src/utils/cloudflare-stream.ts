const CLOUDFLARE_STREAM_ID_REGEX = /(?:^|\/)([a-f0-9]{32})(?:[/?#]|$)/i;

export function extractCloudflareStreamId(url: string | null | undefined): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (/^[a-f0-9]{32}$/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const pathname = new URL(trimmed).pathname;
    const match = pathname.match(CLOUDFLARE_STREAM_ID_REGEX);
    return match?.[1] ?? null;
  } catch {
    const match = trimmed.match(CLOUDFLARE_STREAM_ID_REGEX);
    return match?.[1] ?? null;
  }
}

interface CloudflareEmbedOptions {
  autoplay?: boolean;
  poster?: string | null;
}

export function getCloudflareEmbedUrl(
  url: string | null | undefined,
  options: CloudflareEmbedOptions = {}
) {
  const streamId = extractCloudflareStreamId(url);
  if (!streamId) return null;

  const embedUrl = new URL(`https://iframe.videodelivery.net/${streamId}`);

  if (options.autoplay) {
    embedUrl.searchParams.set('autoplay', 'true');
  }

  if (options.poster) {
    embedUrl.searchParams.set('poster', options.poster);
  }

  return embedUrl.toString();
}
