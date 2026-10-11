import { StyleSheet, Text, View } from 'react-native';

import { PROTEIN_LABELS } from '../constants';
import { formatDayTab } from '../lib/menu';
import { PROTEINS, countWeekProteins, dinnerProteins, mealProteins } from '../lib/proteins';
import { colors, radius, spacing } from '../theme';
import type { DayPlan, Protein } from '../types';
import { Card, Muted } from './ui';

// Acento pequeño por proteína para distinguirlas de un vistazo.
const PROTEIN_COLORS: Record<Protein, { color: string; soft: string }> = {
  carne: { color: colors.danger, soft: colors.dangerSoft },
  pescado: { color: colors.primary, soft: colors.primarySoft },
  huevo: { color: colors.accent, soft: colors.accentSoft },
  legumbre: { color: colors.textMuted, soft: colors.background },
};

export function WeeklyProteins({ days }: { days: DayPlan[] }) {
  // Se calcula en cada render para reflejar al momento las cenas cambiadas.
  const counts = countWeekProteins(days);
  // Solo importan las comidas y cenas que entran en el recuento.
  const hasFallback = days.some(
    (day) =>
      day.schoolMeals.some((meal) => meal.mealType === 'comida' && meal.proteins === undefined) ||
      (day.dinner.dishes.length > 0 && day.dinner.proteins === undefined),
  );

  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.title}>Proteínas de la semana</Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.nameCell, styles.headerText]} />
            <Text style={[styles.numCell, styles.headerText]}>Comida</Text>
            <Text style={[styles.numCell, styles.headerText]}>Cena</Text>
            <Text style={[styles.numCell, styles.totalCell, styles.headerText, styles.totalHeader]}>
              Total
            </Text>
          </View>
          {PROTEINS.map((protein) => (
            <View
              key={protein}
              style={styles.row}
              accessible
              accessibilityLabel={`${PROTEIN_LABELS[protein]}: ${counts.lunch[protein]} en comida, ${counts.dinner[protein]} en cena, ${counts.total[protein]} en total`}
            >
              <View style={[styles.nameCell, styles.nameRow]}>
                <View style={[styles.dot, { backgroundColor: PROTEIN_COLORS[protein].color }]} />
                <Text style={styles.nameText}>{PROTEIN_LABELS[protein]}</Text>
              </View>
              <Text style={[styles.numCell, styles.numText]}>{counts.lunch[protein]}</Text>
              <Text style={[styles.numCell, styles.numText]}>{counts.dinner[protein]}</Text>
              <Text style={[styles.numCell, styles.totalCell, styles.totalText]}>
                {counts.total[protein]}
              </Text>
            </View>
          ))}
        </View>
        <Muted>
          Recuento del menú planificado (comidas del cole y cenas elegidas), no de lo que ha comido
          realmente.
        </Muted>
        {hasFallback ? (
          <Muted>
            Algunos platos se han clasificado automáticamente por su nombre y pueden no ser exactos.
          </Muted>
        ) : null}
      </Card>

      <Card style={styles.dayList}>
        {days.map((day, i) => (
          <DayProteins key={day.date || i} day={day} first={i === 0} />
        ))}
      </Card>
    </View>
  );
}

function DayProteins({ day, first }: { day: DayPlan; first: boolean }) {
  const lunches = day.schoolMeals.filter((meal) => meal.mealType === 'comida');
  const lunchDishes = lunches.flatMap((meal) => meal.dishes);
  const lunchProteins = PROTEINS.filter((protein) =>
    lunches.some((meal) => mealProteins(meal).includes(protein)),
  );
  const hasDinner = day.dinner.dishes.length > 0;
  const dinnerDishes = day.dinner.dishes.map((dish) => dish.name);

  return (
    <View style={[styles.day, !first && styles.dayDivider]}>
      <Text style={styles.dayLabel}>{formatDayTab(day)}</Text>
      <MealLine label="Comida" dishes={lunchDishes} proteins={lunchProteins} />
      <MealLine
        label="Cena"
        dishes={dinnerDishes}
        proteins={hasDinner ? dinnerProteins(day.dinner) : []}
      />
    </View>
  );
}

function MealLine({
  label,
  dishes,
  proteins,
}: {
  label: string;
  dishes: string[];
  proteins: Protein[];
}) {
  return (
    <View style={styles.mealLine}>
      <Text style={styles.mealText}>
        <Text style={styles.mealLabel}>{label}: </Text>
        {dishes.length > 0 ? dishes.join(', ') : '—'}
      </Text>
      {proteins.length > 0 && (
        <View style={styles.badges}>
          {proteins.map((protein) => (
            <ProteinBadge key={protein} protein={protein} />
          ))}
        </View>
      )}
    </View>
  );
}

function ProteinBadge({ protein }: { protein: Protein }) {
  const { color, soft } = PROTEIN_COLORS[protein];
  return (
    <View style={[styles.badge, { backgroundColor: soft, borderColor: color }]}>
      <Text style={[styles.badgeText, { color: protein === 'legumbre' ? colors.text : color }]}>
        {PROTEIN_LABELS[protein]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  row: {
    // Celdas estiradas para que el fondo de la columna Total sea continuo.
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  headerRow: { borderTopWidth: 0, backgroundColor: colors.background },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  nameCell: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nameText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  numCell: { width: 64, paddingVertical: spacing.sm, textAlign: 'center' },
  numText: { fontSize: 15, color: colors.text, lineHeight: 22, fontVariant: ['tabular-nums'] },
  totalCell: { backgroundColor: colors.primarySoft },
  totalHeader: { color: colors.primary },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
  dayList: { gap: 0, paddingVertical: spacing.xs },
  day: { gap: spacing.xs, paddingVertical: spacing.md },
  dayDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dayLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  mealLine: { gap: spacing.xs },
  mealText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  mealLabel: { fontWeight: '600', color: colors.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  badge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
