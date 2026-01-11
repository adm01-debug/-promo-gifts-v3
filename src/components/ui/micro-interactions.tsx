/**
 * Micro-interactions components and hooks
 * Provides visual feedback animations for user interactions
 */

export { 
  InteractiveCard,
  PulseWrapper,
  RippleButton,
  SuccessCheck,
  Spinner,
  AnimatedNumber,
  ShakeWrapper,
  FadeSlide,
} from "./interactive-card";

export {
  useLoadingState,
  useFeedback,
  useShake,
  usePulse,
  useHoverIntent,
  usePressState,
  useCountUp,
  useStaggeredList,
  useAnimateOnScroll,
} from "@/hooks/useMicroInteractions";
