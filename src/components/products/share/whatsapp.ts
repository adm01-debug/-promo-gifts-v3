const BRAZIL_COUNTRY_CODE = "55";

function normalizePhoneForWhatsApp(phone?: string | null) {
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith(BRAZIL_COUNTRY_CODE) && digits.length >= 12) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `${BRAZIL_COUNTRY_CODE}${digits}`;
  }

  return digits;
}

export function openWhatsAppShare({
  message,
  phone,
}: {
  message: string;
  phone?: string | null;
}) {
  const encodedMessage = encodeURIComponent(message);
  const normalizedPhone = normalizePhoneForWhatsApp(phone);
  const url = normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return url;
}