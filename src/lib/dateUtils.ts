/**
 * Helper to format event time strings without seconds.
 * E.g., '08:00:00' -> '08:00'
 */
export const formatTime = (timeStr?: string): string => {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  // Match HH:mm from HH:mm:ss or HH:mm
  const match = trimmed.match(/^(\d{1,2}:\d{2})(?::\d{2})?/);
  return match ? match[1] : trimmed;
};

/**
 * Format a time range cleanly without seconds.
 * E.g., ('08:00:00', '12:00:00') -> '08:00 - 12:00 WIB'
 */
export const formatTimeRange = (start?: string, end?: string): string => {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} - ${e} WIB`;
  if (s) return `${s} WIB`;
  return '';
};
