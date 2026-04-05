/**
 * playTtsAudio — Fetches TTS audio from the edge function and plays it.
 * Returns a promise that resolves when audio finishes or rejects on error.
 */
export function playTtsAudio(
  text: string,
  options?: { onStart?: () => void }
): { promise: Promise<void>; stop: () => void } {
  let audio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;

  const promise = (async () => {
    const ttsResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!ttsResponse.ok) {
      throw new Error(`TTS failed: ${ttsResponse.status}`);
    }

    const blob = await ttsResponse.blob();
    if (blob.size === 0) {
      throw new Error("Empty audio response");
    }

    objectUrl = URL.createObjectURL(blob);
    audio = new Audio(objectUrl);
    options?.onStart?.();

    return new Promise<void>((resolve, reject) => {
      audio!.onended = () => {
        cleanup();
        resolve();
      };
      audio!.onerror = () => {
        cleanup();
        reject(new Error("Audio playback error"));
      };
      audio!.play().catch((err) => {
        cleanup();
        reject(err);
      });
    });
  })();

  function cleanup() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    audio = null;
  }

  function stop() {
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      cleanup();
    }
  }

  return { promise, stop };
}
