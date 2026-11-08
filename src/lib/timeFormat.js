/**
 * Chatly's message clock uses a consistent 12-hour display regardless of the
 * device's 24-hour clock preference. Date values remain in the viewer's local
 * timezone.
 */
export function formatChatTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Time unavailable";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatChatDateTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Invalid message timestamp";
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  });
}
