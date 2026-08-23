export function formatTime(seconds: number): string {
  if (seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function getTimerClasses(seconds: number): string {
  if (seconds <= 3) return 'text-red-500 animate-pulse scale-110';
  if (seconds <= 10) return 'text-red-500';
  return ''; 
}
