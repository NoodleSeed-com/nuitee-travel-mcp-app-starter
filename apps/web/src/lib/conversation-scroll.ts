interface TranscriptMetrics {
  readonly scrollHeight: number;
  readonly scrollTop: number;
  readonly clientHeight: number;
}

export function isNearTranscriptEnd(
  metrics: TranscriptMetrics,
  threshold = 30,
): boolean {
  return metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight
    <= threshold;
}
