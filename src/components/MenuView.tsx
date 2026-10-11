import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MEAL_LABELS } from '../constants';
import { findInitialSelection, formatDayTab, todayISO } from '../lib/menu';
import { colors, radius, spacing } from '../theme';
import type { DayPlan, WeeklyMenu } from '../types';
import { DinnerAlternatives } from './DinnerAlternatives';
import { Card, Chip, Muted } from './ui';

export function MenuView({ menu }: { menu: WeeklyMenu }) {
  const today = todayISO();
  const [selection, setSelection] = useState(() => findInitialSelection(menu, today));
  const weekCount = menu.weeks.length;
  const isMultiWeek = weekCount > 1;
  const weekIndex = Math.min(selection.weekIndex, Math.max(weekCount - 1, 0));
  const week = menu.weeks[weekIndex];
  const day = week?.days[selection.dayIndex] ?? week?.days[0];
  const dayIndex = day ? week.days.indexOf(day) : -1;

  // Al cambiar de semana se abre el primer día, salvo que la semana incluya hoy.
  const goToWeek = (index: number) => {
    const todayIndex = menu.weeks[index].days.findIndex((d) => d.date === today);
    setSelection({ weekIndex: index, dayIndex: Math.max(todayIndex, 0) });
  };

  return (
    <View style={styles.container}>
      {isMultiWeek && (
        <View style={styles.weekSwitcher}>
          <WeekArrow
            direction="back"
            disabled={weekIndex === 0}
            onPress={() => goToWeek(weekIndex - 1)}
          />
          <View style={styles.weekInfo}>
            <Text style={styles.weekLabel} numberOfLines={2}>
              {week.label || `Semana ${weekIndex + 1}`}
            </Text>
            <Text style={styles.weekCount}>
              Semana {weekIndex + 1} de {weekCount}
            </Text>
          </View>
          <WeekArrow
            direction="forward"
            disabled={weekIndex === weekCount - 1}
            onPress={() => goToWeek(weekIndex + 1)}
          />
        </View>
      )}

      {day ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
            {week.days.map((d, i) => (
              <Chip
                key={d.date || i}
                label={d.date === today ? `${formatDayTab(d)} · Hoy` : formatDayTab(d)}
                selected={d === day}
                onPress={() => setSelection({ weekIndex, dayIndex: i })}
              />
            ))}
          </ScrollView>
          <DayCard
            day={day}
            dinnerFooter={
              day.dinner.dishes.length > 0 ? (
                <DinnerAlternatives
                  key={`${weekIndex}-${dayIndex}`}
                  menuId={menu.id}
                  weekIndex={weekIndex}
                  dayIndex={dayIndex}
                  day={day}
                  weekDays={week.days}
                />
              ) : null
            }
          />
        </>
      ) : (
        <Card>
          <Muted>La IA no ha encontrado ningún día en este menú.</Muted>
        </Card>
      )}

      {menu.generalNotes ? (
        <Card>
          <Text style={styles.cardTitle}>{isMultiWeek ? 'Notas del menú' : 'Notas de la semana'}</Text>
          <Muted>{menu.generalNotes}</Muted>
        </Card>
      ) : null}
    </View>
  );
}

function WeekArrow({
  direction,
  disabled,
  onPress,
}: {
  direction: 'back' | 'forward';
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction === 'back' ? 'Semana anterior' : 'Semana siguiente'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.weekArrow, pressed && { opacity: 0.6 }]}
    >
      <Ionicons
        name={direction === 'back' ? 'chevron-back' : 'chevron-forward'}
        size={24}
        color={disabled ? colors.border : colors.primary}
      />
    </Pressable>
  );
}

function DayCard({ day, dinnerFooter }: { day: DayPlan; dinnerFooter?: ReactNode }) {
  return (
    <View style={styles.container}>
      {day.allergenAlerts.length > 0 && (
        <View style={styles.alert}>
          <Ionicons name="warning" size={20} color={colors.danger} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.alertTitle}>Atención: posibles alérgenos</Text>
            {day.allergenAlerts.map((alert, i) => (
              <Text key={i} style={styles.alertText}>
                • {alert}
              </Text>
            ))}
          </View>
        </View>
      )}

      <Card>
        <View style={styles.cardHeader}>
          <Ionicons name="school-outline" size={20} color={colors.primary} />
          <Text style={styles.cardTitle}>En la guardería</Text>
        </View>
        {day.schoolMeals.length === 0 ? (
          <Muted>No hay comidas registradas para este día.</Muted>
        ) : (
          day.schoolMeals.map((meal, i) => (
            <View key={i} style={styles.meal}>
              <Text style={styles.mealLabel}>{MEAL_LABELS[meal.mealType]}</Text>
              {meal.dishes.map((dish, j) => (
                <Text key={j} style={styles.dish}>
                  {dish}
                </Text>
              ))}
            </View>
          ))
        )}
      </Card>

      <Card style={styles.dinnerCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="moon-outline" size={20} color={colors.accent} />
          <Text style={styles.cardTitle}>Cena propuesta</Text>
        </View>
        {day.dinner.dishes.map((dish, i) => (
          <View key={i} style={styles.meal}>
            <Text style={styles.dinnerDish}>{dish.name}</Text>
            {dish.description ? <Muted>{dish.description}</Muted> : null}
          </View>
        ))}
        {day.dinner.nutrientFocus.length > 0 && (
          <View style={styles.chips}>
            {day.dinner.nutrientFocus.map((n) => (
              <Chip key={n} label={n} selected tone="accent" />
            ))}
          </View>
        )}
        {day.dinner.rationale ? (
          <Text style={styles.rationale}>{day.dinner.rationale}</Text>
        ) : null}
        {day.dinner.tips ? (
          <View style={styles.tip}>
            <Ionicons name="bulb-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.rationale, { flex: 1 }]}>{day.dinner.tips}</Text>
          </View>
        ) : null}
        {dinnerFooter}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  weekSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
  },
  weekArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  weekInfo: { flex: 1, alignItems: 'center', gap: 2 },
  weekLabel: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  weekCount: { fontSize: 12, color: colors.textMuted },
  dayTabs: { gap: spacing.sm, paddingVertical: spacing.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  meal: { gap: 2, paddingTop: spacing.xs },
  mealLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dish: { fontSize: 15, color: colors.text, lineHeight: 21 },
  dinnerCard: { borderColor: colors.accent, borderWidth: 1.5 },
  dinnerDish: { fontSize: 16, fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingTop: spacing.xs },
  rationale: { fontSize: 14, color: colors.text, lineHeight: 20 },
  tip: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  alert: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  alertTitle: { fontWeight: '700', color: colors.danger },
  alertText: { color: colors.danger, fontSize: 14, lineHeight: 20 },
});
