import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MEAL_LABELS, WEEKDAY_LABELS, WEEKDAYS } from '../constants';
import { colors, radius, spacing } from '../theme';
import type { DayPlan, WeeklyMenu } from '../types';
import { Card, Chip, Muted } from './ui';

function todayWeekday() {
  // getDay(): 0 = domingo
  return WEEKDAYS[(new Date().getDay() + 6) % 7];
}

export function MenuView({ menu }: { menu: WeeklyMenu }) {
  const days = [...menu.days].sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day));
  const initial = days.find((d) => d.day === todayWeekday()) ?? days[0];
  const [selected, setSelected] = useState(initial?.day);
  const day = days.find((d) => d.day === selected) ?? initial;

  if (!day) {
    return (
      <Card>
        <Muted>La IA no ha encontrado ningún día en este menú.</Muted>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
        {days.map((d) => (
          <Chip
            key={d.day}
            label={WEEKDAY_LABELS[d.day]}
            selected={d.day === day.day}
            onPress={() => setSelected(d.day)}
          />
        ))}
      </ScrollView>
      <DayCard day={day} />
      {menu.generalNotes ? (
        <Card>
          <Text style={styles.cardTitle}>Notas de la semana</Text>
          <Muted>{menu.generalNotes}</Muted>
        </Card>
      ) : null}
    </View>
  );
}

function DayCard({ day }: { day: DayPlan }) {
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
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
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
