const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad2 = (n: number) => String(n).padStart(2, '0');

export function formatMenuDate(d: Date): string {
  return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function formatTime(d: Date, clock24: boolean): string {
  if (clock24) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const suffix = d.getHours() < 12 ? 'AM' : 'PM';
  return `${formatPhoneTime(d, false)} ${suffix}`;
}

export function formatPhoneTime(d: Date, clock24: boolean): string {
  if (clock24) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const hours = d.getHours() % 12 || 12;
  return `${hours}:${pad2(d.getMinutes())}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}
