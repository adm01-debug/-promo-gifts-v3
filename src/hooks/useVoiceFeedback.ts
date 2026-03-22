import { useCallback, useRef } from "react";

interface VoiceFeedbackOptions {
  volume?: number;
}

// Simple Web Audio API-based sound feedback
export function useVoiceFeedback(options: VoiceFeedbackOptions = {}) {
  const { volume = 0.3 } = options;
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext!)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((
    frequency: number, 
    duration: number, 
    type: OscillatorType = "sine",
    fadeOut: boolean = true
  ) => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      if (fadeOut) {
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      }

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.error("Error playing audio feedback:", error);
    }
  }, [getAudioContext, volume]);

  const playChord = useCallback((frequencies: number[], duration: number) => {
    frequencies.forEach(freq => {
      playTone(freq, duration, "sine", true);
    });
  }, [playTone]);

  // Sound: Start listening - ascending tones
  const playStartListening = useCallback(() => {
    const ctx = getAudioContext();
    // Play ascending "boop boop" sound
    setTimeout(() => playTone(440, 0.1, "sine"), 0);
    setTimeout(() => playTone(554, 0.1, "sine"), 100);
    setTimeout(() => playTone(659, 0.15, "sine"), 200);
  }, [getAudioContext, playTone]);

  // Sound: Stop listening - descending tones
  const playStopListening = useCallback(() => {
    // Play descending "boop" sound
    setTimeout(() => playTone(659, 0.1, "sine"), 0);
    setTimeout(() => playTone(440, 0.15, "sine"), 100);
  }, [playTone]);

  // Sound: Command recognized - pleasant confirmation
  const playCommandRecognized = useCallback(() => {
    // Pleasant "success" chord
    playChord([523, 659, 784], 0.2); // C major chord
  }, [playChord]);

  // Sound: Command executed successfully
  const playCommandSuccess = useCallback(() => {
    // Quick ascending success sound
    setTimeout(() => playTone(523, 0.08, "sine"), 0);
    setTimeout(() => playTone(659, 0.08, "sine"), 80);
    setTimeout(() => playTone(784, 0.15, "sine"), 160);
  }, [playTone]);

  // Sound: Error occurred
  const playError = useCallback(() => {
    // Low buzzing error sound
    setTimeout(() => playTone(220, 0.15, "square"), 0);
    setTimeout(() => playTone(180, 0.2, "square"), 150);
  }, [playTone]);

  // Sound: Thinking/processing
  const playProcessing = useCallback(() => {
    // Subtle processing beep
    playTone(600, 0.08, "sine");
  }, [playTone]);

  // Sound: Navigation action
  const playNavigation = useCallback(() => {
    // Whoosh-like sound
    setTimeout(() => playTone(300, 0.05, "sine"), 0);
    setTimeout(() => playTone(400, 0.05, "sine"), 30);
    setTimeout(() => playTone(500, 0.05, "sine"), 60);
    setTimeout(() => playTone(600, 0.08, "sine"), 90);
  }, [playTone]);

  // Sound: Filter applied
  const playFilterApplied = useCallback(() => {
    // Quick "tick" sound
    playTone(800, 0.05, "sine");
  }, [playTone]);

  return {
    playStartListening,
    playStopListening,
    playCommandRecognized,
    playCommandSuccess,
    playError,
    playProcessing,
    playNavigation,
    playFilterApplied,
  };
}
