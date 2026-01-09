import confetti from "canvas-confetti";

// Basic celebration confetti
export function celebrateConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
}

// Big celebration (goal achieved, order confirmed, etc.)
export function bigCelebration() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
}

// Side cannons (achievement unlocked)
export function sideCannons() {
  const end = Date.now() + 500;

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: ["#bb0000", "#ffffff"]
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: ["#bb0000", "#ffffff"]
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

// Fireworks effect
export function fireworks() {
  const duration = 5000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 45, spread: 360, ticks: 100, zIndex: 9999 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 100 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.2, 0.8), y: randomInRange(0.2, 0.6) },
      colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"]
    });
  }, 400);
}

// Stars falling
export function starsFalling() {
  const defaults = {
    spread: 360,
    ticks: 100,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    shapes: ["star"] as confetti.Shape[],
    colors: ["#FFE400", "#FFBD00", "#E89400", "#FFCA6C", "#FDFFB8"]
  };

  function shoot() {
    confetti({
      ...defaults,
      particleCount: 40,
      scalar: 1.2,
      shapes: ["star"] as confetti.Shape[]
    });

    confetti({
      ...defaults,
      particleCount: 10,
      scalar: 0.75,
      shapes: ["circle"] as confetti.Shape[]
    });
  }

  setTimeout(shoot, 0);
  setTimeout(shoot, 100);
  setTimeout(shoot, 200);
}

// Emoji rain (custom emoji celebration)
export function emojiRain(emoji: string = "🎉") {
  const scalar = 2;
  const unicorn = confetti.shapeFromText({ text: emoji, scalar });

  const defaults = {
    spread: 360,
    ticks: 60,
    gravity: 0.5,
    decay: 0.96,
    startVelocity: 20,
    shapes: [unicorn],
    scalar
  };

  function shoot() {
    confetti({
      ...defaults,
      particleCount: 30
    });

    confetti({
      ...defaults,
      particleCount: 5,
      flat: true
    });
  }

  setTimeout(shoot, 0);
  setTimeout(shoot, 100);
  setTimeout(shoot, 200);
}

// Gentle celebration (subtle effect)
export function gentleCelebration() {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.7 },
    colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"],
    gravity: 1.5,
    scalar: 0.8
  });
}

// Context-specific celebrations
export const celebrations = {
  // Sales/Goals
  goalAchieved: bigCelebration,
  orderConfirmed: celebrateConfetti,
  quoteApproved: gentleCelebration,
  
  // Special occasions
  welcome: () => emojiRain("👋"),
  birthday: () => emojiRain("🎂"),
  newYear: fireworks
};

// Hook for celebrations with sound (optional)
export function useCelebration() {
  const celebrate = (type: keyof typeof celebrations) => {
    const celebrationFn = celebrations[type];
    if (celebrationFn) {
      celebrationFn();
    }
  };

  return { celebrate, ...celebrations };
}
