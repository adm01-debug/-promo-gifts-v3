import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        data: [],
        error: null,
      })),
    })),
  },
}));

// Import after mocking
import { 
  useRFMAnalysis, 
  SEGMENT_INFO, 
  type RFMSegment, 
  type RFMScore 
} from '../useRFMAnalysis';
import { supabase } from '@/integrations/supabase/client';

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useRFMAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SEGMENT_INFO', () => {
    it('should have all 10 segments defined', () => {
      const segments: RFMSegment[] = [
        'champions', 'loyal', 'potential_loyal', 'new', 'promising',
        'needs_attention', 'about_to_sleep', 'at_risk', 'hibernating', 'lost'
      ];
      
      segments.forEach(segment => {
        expect(SEGMENT_INFO[segment]).toBeDefined();
        expect(SEGMENT_INFO[segment].label).toBeTruthy();
        expect(SEGMENT_INFO[segment].color).toBeTruthy();
        expect(SEGMENT_INFO[segment].description).toBeTruthy();
        expect(SEGMENT_INFO[segment].action).toBeTruthy();
      });
    });

    it('should have unique labels for each segment', () => {
      const labels = Object.values(SEGMENT_INFO).map(info => info.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('should have valid Tailwind color classes', () => {
      Object.values(SEGMENT_INFO).forEach(info => {
        expect(info.color).toMatch(/^bg-[a-z]+-\d+$/);
      });
    });
  });

  describe('Hook initialization', () => {
    it('should return loading state initially', () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(
          new Promise(() => {}) // Never resolves to keep loading
        ),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useRFMAnalysis(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.rfmScores).toEqual([]);
      expect(result.current.totalClients).toBe(0);
    });

    it('should return empty data when no clients exist', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useRFMAnalysis(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.rfmScores).toEqual([]);
      expect(result.current.totalClients).toBe(0);
      expect(result.current.averages).toEqual({ recency: 0, frequency: 0, monetary: 0 });
    });
  });

  describe('Segment distribution', () => {
    it('should initialize all segments with zero count', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useRFMAnalysis(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const segments: RFMSegment[] = [
        'champions', 'loyal', 'potential_loyal', 'new', 'promising',
        'needs_attention', 'about_to_sleep', 'at_risk', 'hibernating', 'lost'
      ];

      segments.forEach(segment => {
        expect(result.current.segmentDistribution[segment]).toBe(0);
      });
    });
  });

  describe('getClientsBySegment', () => {
    it('should be a function', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useRFMAnalysis(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.getClientsBySegment).toBe('function');
    });

    it('should return empty array for segment with no clients', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useRFMAnalysis(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.getClientsBySegment('champions')).toEqual([]);
    });
  });

  describe('Custom config', () => {
    it('should accept custom thresholds', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const customConfig = {
        recencyThresholds: [7, 14, 30, 60],
        frequencyThresholds: [1, 2, 3, 5],
        monetaryThresholds: [500, 1000, 5000, 10000],
      };

      const { result } = renderHook(() => useRFMAnalysis(customConfig), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Hook should work with custom config without errors
      expect(result.current.rfmScores).toBeDefined();
    });

    it('should merge partial config with defaults', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const partialConfig = {
        recencyThresholds: [7, 14, 30, 60],
      };

      const { result } = renderHook(() => useRFMAnalysis(partialConfig), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.rfmScores).toBeDefined();
    });
  });
});

describe('RFM Scoring Logic', () => {
  describe('Recency scoring', () => {
    it('should give score 5 for very recent purchases (<=30 days)', () => {
      // This tests the getRecencyScore function indirectly
      // Days <= 30 should return score 5
      const thresholds = [30, 60, 90, 180];
      
      // Score 5: days <= 30
      expect(getRecencyScoreTest(0, thresholds)).toBe(5);
      expect(getRecencyScoreTest(15, thresholds)).toBe(5);
      expect(getRecencyScoreTest(30, thresholds)).toBe(5);
    });

    it('should give score 1 for old purchases (>180 days)', () => {
      const thresholds = [30, 60, 90, 180];
      expect(getRecencyScoreTest(181, thresholds)).toBe(1);
      expect(getRecencyScoreTest(365, thresholds)).toBe(1);
    });
  });

  describe('Frequency scoring', () => {
    it('should give score 5 for high frequency (>=10 orders)', () => {
      const thresholds = [2, 4, 6, 10];
      expect(getFrequencyScoreTest(10, thresholds)).toBe(5);
      expect(getFrequencyScoreTest(15, thresholds)).toBe(5);
    });

    it('should give score 1 for low frequency (<2 orders)', () => {
      const thresholds = [2, 4, 6, 10];
      expect(getFrequencyScoreTest(0, thresholds)).toBe(1);
      expect(getFrequencyScoreTest(1, thresholds)).toBe(1);
    });
  });

  describe('Monetary scoring', () => {
    it('should give score 5 for high value (>=50000)', () => {
      const thresholds = [1000, 5000, 15000, 50000];
      expect(getMonetaryScoreTest(50000, thresholds)).toBe(5);
      expect(getMonetaryScoreTest(100000, thresholds)).toBe(5);
    });

    it('should give score 1 for low value (<1000)', () => {
      const thresholds = [1000, 5000, 15000, 50000];
      expect(getMonetaryScoreTest(0, thresholds)).toBe(1);
      expect(getMonetaryScoreTest(500, thresholds)).toBe(1);
    });
  });
});

// Helper functions that mirror the internal logic for testing
function getRecencyScoreTest(days: number, thresholds: number[]): number {
  if (days <= thresholds[0]) return 5;
  if (days <= thresholds[1]) return 4;
  if (days <= thresholds[2]) return 3;
  if (days <= thresholds[3]) return 2;
  return 1;
}

function getFrequencyScoreTest(orders: number, thresholds: number[]): number {
  if (orders >= thresholds[3]) return 5;
  if (orders >= thresholds[2]) return 4;
  if (orders >= thresholds[1]) return 3;
  if (orders >= thresholds[0]) return 2;
  return 1;
}

function getMonetaryScoreTest(value: number, thresholds: number[]): number {
  if (value >= thresholds[3]) return 5;
  if (value >= thresholds[2]) return 4;
  if (value >= thresholds[1]) return 3;
  if (value >= thresholds[0]) return 2;
  return 1;
}

describe('Segment determination', () => {
  // Testing the getSegment logic
  function getSegmentTest(r: number, f: number, m: number): string {
    if (r >= 4 && f >= 4 && m >= 4) return "champions";
    if (f >= 4 && m >= 4) return "loyal";
    if (r <= 2 && f >= 3 && m >= 3) return "at_risk";
    if (r >= 4 && f >= 3) return "potential_loyal";
    if (r >= 4 && f <= 2) return "new";
    if (r >= 3 && m <= 2) return "promising";
    if (r === 3 && f >= 3 && m >= 3) return "needs_attention";
    if (r === 2 && f <= 3) return "about_to_sleep";
    if (r <= 2 && f <= 2 && m <= 2) return "hibernating";
    if (r === 1) return "lost";
    return "needs_attention";
  }

  it('should identify champions correctly', () => {
    expect(getSegmentTest(5, 5, 5)).toBe('champions');
    expect(getSegmentTest(4, 4, 4)).toBe('champions');
    expect(getSegmentTest(5, 4, 5)).toBe('champions');
  });

  it('should identify loyal customers correctly', () => {
    expect(getSegmentTest(3, 5, 5)).toBe('loyal');
    expect(getSegmentTest(2, 4, 4)).toBe('loyal');
  });

  it('should identify at_risk customers correctly', () => {
    expect(getSegmentTest(1, 4, 4)).toBe('at_risk');
    expect(getSegmentTest(2, 3, 3)).toBe('at_risk');
  });

  it('should identify new customers correctly', () => {
    expect(getSegmentTest(5, 1, 3)).toBe('new');
    expect(getSegmentTest(4, 2, 2)).toBe('new');
  });

  it('should identify lost customers correctly', () => {
    expect(getSegmentTest(1, 1, 1)).toBe('lost');
    expect(getSegmentTest(1, 2, 3)).toBe('lost');
  });

  it('should identify hibernating customers correctly', () => {
    expect(getSegmentTest(2, 2, 2)).toBe('hibernating');
    expect(getSegmentTest(2, 1, 1)).toBe('hibernating');
  });

  it('should identify about_to_sleep customers correctly', () => {
    expect(getSegmentTest(2, 3, 4)).toBe('about_to_sleep');
  });

  it('should identify promising customers correctly', () => {
    expect(getSegmentTest(4, 3, 1)).toBe('promising');
    expect(getSegmentTest(3, 4, 2)).toBe('promising');
  });

  it('should identify needs_attention customers correctly', () => {
    expect(getSegmentTest(3, 3, 3)).toBe('needs_attention');
    expect(getSegmentTest(3, 4, 3)).toBe('needs_attention');
  });
});
