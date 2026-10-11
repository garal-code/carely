// Utilidades puras para menús semanales y mensuales. Sin dependencias (solo
// tipos) para poder probarlas con `node --test`.
import type { DayPlan, DinnerProposal, WeekPlan, Weekday, WeeklyMenu } from '../types';

const WEEKDAY_ORDER: Weekday[] = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
];

const SHORT_WEEKDAY: Record<Weekday, string> = {
  lunes: 'Lun',
  martes: 'Mar',
  miercoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sabado: 'Sáb',
  domingo: 'Dom',
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

type Selection = { weekIndex: number; dayIndex: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function weekdayIndex(day: DayPlan): number {
  const index = WEEKDAY_ORDER.indexOf(day.day);
  return index === -1 ? WEEKDAY_ORDER.length : index;
}

/** Ordena por fecha; si alguna falta (menús antiguos), por día de la semana. */
function compareDays(a: DayPlan, b: DayPlan): number {
  if (a.date && b.date) return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  return weekdayIndex(a) - weekdayIndex(b);
}

function sortWeek(week: WeekPlan): WeekPlan {
  return { ...week, days: [...week.days].sort(compareDays) };
}

function firstDate(week: WeekPlan): string {
  return week.days.find((d) => d.date)?.date ?? '';
}

function parseWeeks(raw: unknown): WeekPlan[] | null {
  if (!Array.isArray(raw)) return null;
  const weeks: WeekPlan[] = [];
  for (const week of raw) {
    if (!isRecord(week) || !Array.isArray(week.days)) return null;
    weeks.push(
      sortWeek({
        label: typeof week.label === 'string' ? week.label : '',
        days: week.days.filter(isRecord) as unknown as DayPlan[],
      }),
    );
  }
  // Solo se reordenan las semanas si todas tienen fecha.
  if (weeks.every((w) => firstDate(w))) {
    weeks.sort((a, b) => (firstDate(a) < firstDate(b) ? -1 : firstDate(a) > firstDate(b) ? 1 : 0));
  }
  return weeks;
}

/**
 * Valida un menú guardado y lo adapta al formato actual. Los menús antiguos
 * `{ weekLabel, days }` se convierten en un menú de una sola semana.
 * Devuelve null si los datos no tienen forma de menú.
 */
export function normalizeMenu(raw: unknown): WeeklyMenu | null {
  if (!isRecord(raw)) return null;

  if ('weeks' in raw) {
    const weeks = parseWeeks(raw.weeks);
    if (!weeks) return null;
    return {
      ...raw,
      title: typeof raw.title === 'string' ? raw.title : '',
      weeks,
      generalNotes: typeof raw.generalNotes === 'string' ? raw.generalNotes : '',
    } as WeeklyMenu;
  }

  const { weekLabel, days, ...rest } = raw;
  if (typeof weekLabel !== 'string' || !Array.isArray(days)) return null;
  const weeks = parseWeeks([{ label: weekLabel, days }]);
  if (!weeks) return null;
  return {
    ...rest,
    title: weekLabel,
    weeks,
    generalNotes: typeof rest.generalNotes === 'string' ? rest.generalNotes : '',
  } as WeeklyMenu;
}

/**
 * Semana y día que se muestran al abrir un menú: hoy si aparece; si no, el
 * siguiente día con menú (aunque sea en la semana siguiente). Si el menú ya
 * pasó, la última semana; sin fechas, el primer día.
 */
export function findInitialSelection(menu: WeeklyMenu, today: string): Selection {
  let hasDates = false;
  for (let weekIndex = 0; weekIndex < menu.weeks.length; weekIndex++) {
    const days = menu.weeks[weekIndex].days;
    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const date = days[dayIndex].date;
      if (!date) continue;
      hasDates = true;
      if (date >= today) return { weekIndex, dayIndex };
    }
  }
  if (!hasDates) return { weekIndex: 0, dayIndex: 0 };
  return { weekIndex: menu.weeks.length - 1, dayIndex: 0 };
}

/**
 * Devuelve una copia del menú con la cena de ese día sustituida. Si los índices
 * no existen devuelve el mismo menú.
 */
export function replaceDinner(
  menu: WeeklyMenu,
  weekIndex: number,
  dayIndex: number,
  dinner: DinnerProposal,
): WeeklyMenu {
  const week = menu.weeks[weekIndex];
  if (!week?.days[dayIndex]) return menu;
  return {
    ...menu,
    weeks: menu.weeks.map((w, wi) =>
      wi !== weekIndex
        ? w
        : { ...w, days: w.days.map((d, di) => (di === dayIndex ? { ...d, dinner } : d)) },
    ),
  };
}

/** Etiqueta corta de la pestaña de un día, p. ej. "Lun 6" (o "Lun" sin fecha). */
export function formatDayTab(day: DayPlan): string {
  const weekday = SHORT_WEEKDAY[day.day] ?? day.day;
  const match = DATE_RE.exec(day.date);
  if (!match) return weekday;
  return `${weekday} ${Number(match[3])}`;
}

/** Fecha local de hoy en formato AAAA-MM-DD. */
export function todayISO(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
