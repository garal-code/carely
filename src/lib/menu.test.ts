import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { DayPlan, Weekday, WeeklyMenu } from '../types';
import { findInitialSelection, formatDayTab, normalizeMenu, todayISO } from './menu.ts';

function day(dayName: Weekday, date: string): DayPlan {
  return {
    day: dayName,
    date,
    schoolMeals: [{ mealType: 'comida', dishes: ['Lentejas'] }],
    allergenAlerts: [],
    dinner: { dishes: [], rationale: '', nutrientFocus: [], tips: '' },
  };
}

const META = {
  id: 'm1',
  createdAt: '2026-10-01T10:00:00.000Z',
  source: { kind: 'pdf' as const, name: 'octubre.pdf' },
  provider: 'claude' as const,
  model: 'claude-sonnet',
};

function menu(weeks: { label: string; days: DayPlan[] }[]): WeeklyMenu {
  return { ...META, title: 'Octubre 2026', weeks, generalNotes: '' };
}

// Mes de octubre 2026: el 5 es lunes.
const OCTOBER = menu([
  {
    label: '5-9 oct',
    days: [day('lunes', '2026-10-05'), day('martes', '2026-10-06'), day('viernes', '2026-10-09')],
  },
  {
    label: '12-16 oct',
    days: [day('lunes', '2026-10-12'), day('miercoles', '2026-10-14'), day('viernes', '2026-10-16')],
  },
]);

describe('normalizeMenu', () => {
  test('convierte un menú antiguo { weekLabel, days } en una sola semana', () => {
    const legacy = {
      ...META,
      weekLabel: 'Semana del 6 al 10 de octubre',
      days: [day('miercoles', ''), day('lunes', ''), day('viernes', '')],
      generalNotes: 'Notas',
    };
    const result = normalizeMenu(legacy);
    assert.ok(result);
    assert.equal(result.title, 'Semana del 6 al 10 de octubre');
    assert.equal(result.generalNotes, 'Notas');
    assert.equal(result.id, 'm1');
    assert.equal('weekLabel' in result, false);
    assert.equal('days' in result, false);
    assert.equal(result.weeks.length, 1);
    assert.equal(result.weeks[0].label, 'Semana del 6 al 10 de octubre');
    assert.deepEqual(
      result.weeks[0].days.map((d) => d.day),
      ['lunes', 'miercoles', 'viernes'],
    );
  });

  test('ordena semanas y días cronológicamente por fecha', () => {
    const unsorted = menu([
      { label: 'segunda', days: [day('viernes', '2026-10-16'), day('lunes', '2026-10-12')] },
      { label: 'primera', days: [day('martes', '2026-10-06'), day('lunes', '2026-10-05')] },
    ]);
    const result = normalizeMenu(unsorted);
    assert.ok(result);
    assert.deepEqual(
      result.weeks.map((w) => w.label),
      ['primera', 'segunda'],
    );
    assert.deepEqual(
      result.weeks.map((w) => w.days.map((d) => d.date)),
      [
        ['2026-10-05', '2026-10-06'],
        ['2026-10-12', '2026-10-16'],
      ],
    );
  });

  test('mantiene intacto un menú nuevo ya ordenado', () => {
    assert.deepEqual(normalizeMenu(OCTOBER), OCTOBER);
  });

  test('devuelve null para datos no válidos', () => {
    assert.equal(normalizeMenu(null), null);
    assert.equal(normalizeMenu('menu'), null);
    assert.equal(normalizeMenu(42), null);
    assert.equal(normalizeMenu([]), null);
    assert.equal(normalizeMenu({}), null);
    assert.equal(normalizeMenu({ weeks: 'no' }), null);
    assert.equal(normalizeMenu({ weekLabel: 'x', days: 'no' }), null);
  });
});

describe('findInitialSelection', () => {
  test('selecciona el día cuya fecha es hoy', () => {
    assert.deepEqual(findInitialSelection(OCTOBER, '2026-10-14'), { weekIndex: 1, dayIndex: 1 });
    assert.deepEqual(findInitialSelection(OCTOBER, '2026-10-05'), { weekIndex: 0, dayIndex: 0 });
  });

  test('dentro de una semana sin menú para hoy, elige el siguiente día de esa semana', () => {
    // Miércoles 7 no tiene menú: siguiente día es el viernes 9.
    assert.deepEqual(findInitialSelection(OCTOBER, '2026-10-07'), { weekIndex: 0, dayIndex: 2 });
  });

  test('en el fin de semana entre dos semanas, salta a la semana siguiente', () => {
    assert.deepEqual(findInitialSelection(OCTOBER, '2026-10-10'), { weekIndex: 1, dayIndex: 0 });
  });

  test('antes de todas las semanas, selecciona el primer día', () => {
    assert.deepEqual(findInitialSelection(OCTOBER, '2026-09-20'), { weekIndex: 0, dayIndex: 0 });
  });

  test('después de todas las semanas, selecciona la última semana y su primer día', () => {
    assert.deepEqual(findInitialSelection(OCTOBER, '2026-11-02'), { weekIndex: 1, dayIndex: 0 });
  });

  test('menú vacío o sin fechas devuelve 0/0', () => {
    assert.deepEqual(findInitialSelection(menu([]), '2026-10-14'), { weekIndex: 0, dayIndex: 0 });
    const undated = menu([{ label: 'x', days: [day('lunes', ''), day('martes', '')] }]);
    assert.deepEqual(findInitialSelection(undated, '2026-10-14'), { weekIndex: 0, dayIndex: 0 });
  });
});

describe('formatDayTab', () => {
  test('usa el día de la semana abreviado y el día del mes', () => {
    assert.equal(formatDayTab(day('lunes', '2026-10-05')), 'Lun 5');
    assert.equal(formatDayTab(day('miercoles', '2026-10-14')), 'Mié 14');
    assert.equal(formatDayTab(day('sabado', '2026-10-31')), 'Sáb 31');
  });

  test('sin fecha muestra solo el día de la semana abreviado', () => {
    assert.equal(formatDayTab(day('domingo', '')), 'Dom');
    assert.equal(formatDayTab(day('jueves', '')), 'Jue');
  });
});

describe('todayISO', () => {
  test('devuelve la fecha local en formato AAAA-MM-DD', () => {
    const now = new Date();
    const expected = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    assert.equal(todayISO(), expected);
  });
});
