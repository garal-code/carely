import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { DayPlan, DinnerProposal, Protein, SchoolMeal } from '../types';
import { countWeekProteins, detectProteins, dinnerProteins, mealProteins } from './proteins.ts';

function dinner(names: string[], proteins?: Protein[]): DinnerProposal {
  return {
    dishes: names.map((name) => ({ name, description: '' })),
    rationale: '',
    nutrientFocus: [],
    tips: '',
    ...(proteins ? { proteins } : {}),
  };
}

function day(schoolMeals: SchoolMeal[], d: DinnerProposal): DayPlan {
  return { day: 'lunes', date: '', schoolMeals, allergenAlerts: [], dinner: d };
}

const ZERO = { carne: 0, pescado: 0, huevo: 0, legumbre: 0 };

describe('detectProteins', () => {
  test('detecta cada grupo por palabras clave', () => {
    assert.deepEqual(detectProteins('Pollo asado con patatas'), ['carne']);
    assert.deepEqual(detectProteins('Merluza en salsa verde'), ['pescado']);
    assert.deepEqual(detectProteins('Tortilla de patata'), ['huevo']);
    assert.deepEqual(detectProteins('Lentejas estofadas'), ['legumbre']);
    assert.deepEqual(detectProteins('Crema de calabaza'), []);
  });

  test('ignora mayúsculas y tildes', () => {
    assert.deepEqual(detectProteins('SALMÓN AL HORNO'), ['pescado']);
    assert.deepEqual(detectProteins('salmon al horno'), ['pescado']);
    assert.deepEqual(detectProteins('Albondigas en salsa'), ['carne']);
    assert.deepEqual(detectProteins('JAMÓN york'), ['carne']);
    assert.deepEqual(detectProteins('Atun con tomate'), ['pescado']);
  });

  test('devuelve varios grupos en orden fijo y sin repetir', () => {
    assert.deepEqual(detectProteins('Garbanzos con huevo y chorizo; huevo duro'), [
      'carne',
      'huevo',
      'legumbre',
    ]);
  });

  test('las judías verdes no cuentan como legumbre', () => {
    assert.deepEqual(detectProteins('Judías verdes con patata'), []);
    assert.deepEqual(detectProteins('Judias blancas estofadas'), ['legumbre']);
    assert.deepEqual(detectProteins('Judía pinta'), ['legumbre']);
  });

  test('"lomo/filete de" y la salsa de soja no engañan al detector', () => {
    assert.deepEqual(detectProteins('Lomo de merluza al horno'), ['pescado']);
    assert.deepEqual(detectProteins('Filete de salmón'), ['pescado']);
    assert.deepEqual(detectProteins('Lomo de cerdo'), ['carne']);
    assert.deepEqual(detectProteins('Lomo adobado'), ['carne']);
    assert.deepEqual(detectProteins('Arroz con salsa de soja'), []);
    assert.deepEqual(detectProteins('Tofu salteado con salsa de soja'), ['legumbre']);
  });

  test('solo coincide con palabras completas o sus derivados', () => {
    // "lomo" no está dentro de "palomitas", ni "rape" dentro de "uva grape".
    assert.deepEqual(detectProteins('Palomitas'), []);
    assert.deepEqual(detectProteins('Zumo de grapefruit'), []);
    assert.deepEqual(detectProteins('Huevos revueltos'), ['huevo']);
  });
});

describe('mealProteins / dinnerProteins', () => {
  test('las etiquetas explícitas ganan a las palabras clave', () => {
    assert.deepEqual(
      mealProteins({ mealType: 'comida', dishes: ['Pollo asado'], proteins: ['legumbre'] }),
      ['legumbre'],
    );
    assert.deepEqual(
      mealProteins({ mealType: 'comida', dishes: ['Pollo asado'], proteins: [] }),
      [],
    );
    assert.deepEqual(dinnerProteins(dinner(['Tortilla'], ['pescado'])), ['pescado']);
  });

  test('sin etiquetas usa las palabras clave', () => {
    assert.deepEqual(mealProteins({ mealType: 'comida', dishes: ['Arroz', 'Merluza'] }), [
      'pescado',
    ]);
    const d = dinner(['Crema de verduras']);
    d.dishes[0].description = 'Con un huevo poché por encima';
    assert.deepEqual(dinnerProteins(d), ['huevo']);
  });
});

describe('countWeekProteins', () => {
  test('cuenta comidas del cole y cenas, mezclando días etiquetados y sin etiquetar', () => {
    const days: DayPlan[] = [
      day(
        [
          { mealType: 'desayuno', dishes: ['Tostada con jamón'], proteins: ['carne'] },
          { mealType: 'comida', dishes: ['Lentejas', 'Pollo'], proteins: ['legumbre', 'carne'] },
        ],
        dinner(['Merluza al horno'], ['pescado']),
      ),
      day(
        [
          { mealType: 'comida', dishes: ['Garbanzos con huevo duro'] },
          { mealType: 'merienda', dishes: ['Yogur'] },
        ],
        dinner(['Tortilla francesa', 'Huevos rellenos']),
      ),
    ];
    const counts = countWeekProteins(days);
    assert.deepEqual(counts.lunch, { carne: 1, pescado: 0, huevo: 1, legumbre: 2 });
    assert.deepEqual(counts.dinner, { carne: 0, pescado: 1, huevo: 1, legumbre: 0 });
  });

  test('una cena sin platos no cuenta', () => {
    const counts = countWeekProteins([
      day([{ mealType: 'comida', dishes: ['Salmón'] }], dinner([], ['carne'])),
    ]);
    assert.deepEqual(counts.dinner, ZERO);
    assert.deepEqual(counts.lunch, { ...ZERO, pescado: 1 });
  });

  test('el total es la suma de comida y cena', () => {
    const counts = countWeekProteins([
      day([{ mealType: 'comida', dishes: ['Pollo'] }], dinner(['Pavo a la plancha'])),
      day([{ mealType: 'comida', dishes: ['Bacalao'] }], dinner(['Hummus con verduras'])),
    ]);
    assert.deepEqual(counts.lunch, { ...ZERO, carne: 1, pescado: 1 });
    assert.deepEqual(counts.dinner, { ...ZERO, carne: 1, legumbre: 1 });
    assert.deepEqual(counts.total, { carne: 2, pescado: 1, huevo: 0, legumbre: 1 });
  });

  test('sin días todo vale cero', () => {
    assert.deepEqual(countWeekProteins([]), { lunch: ZERO, dinner: ZERO, total: ZERO });
  });
});
