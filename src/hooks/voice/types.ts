export interface VoiceAgentAction {
  action: "search" | "filter" | "navigate" | "sort" | "clear" | "answer";
  response: string;
  data?: {
    query?: string;
    route?: string;
    sortBy?: string;
    filters?: {
      category?: string;
      color?: string;
      material?: string;
      maxPrice?: number;
      minPrice?: number;
      inStock?: boolean;
      isKit?: boolean;
    };
  };
}

export type VoiceAgentPhase = "idle" | "listening" | "processing" | "speaking" | "error";

export interface UseVoiceAgentOptions {
  onAction?: (action: VoiceAgentAction) => void;
  onError?: (error: string) => void;
}
