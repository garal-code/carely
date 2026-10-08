const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseBirthDate(value: string): Date | null {
  const match = DATE_RE.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  if (date.getTime() > Date.now()) return null;
  return date;
}

/** Edad legible en español, p. ej. "2 años y 3 meses" o "14 meses". */
export function describeAge(birthDate: string, now = new Date()): string | null {
  const birth = parseBirthDate(birthDate);
  if (!birth) return null;
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  months = Math.max(0, months);

  if (months < 24) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearsText = `${years} años`;
  if (rest === 0) return yearsText;
  return `${yearsText} y ${rest} ${rest === 1 ? 'mes' : 'meses'}`;
}
