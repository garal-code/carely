import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../context/AppContext';
import { requestDinnerAlternative } from '../lib/api';
import { colors, radius, spacing } from '../theme';
import type { DayPlan, DinnerMode, DinnerProposal } from '../types';
import { Button, Card, Chip, Field, Muted } from './ui';

const PANTRY_MAX_LENGTH = 1000;

/**
 * Pide a la IA otra cena para el día seleccionado y deja aceptarla o descartarla.
 * El estado es del día: el padre la monta con una `key` por día.
 */
export function DinnerAlternatives({
  menuId,
  weekIndex,
  dayIndex,
  day,
  weekDays,
}: {
  menuId: string;
  weekIndex: number;
  dayIndex: number;
  day: DayPlan;
  weekDays: DayPlan[];
}) {
  const { profile, replaceDinner } = useApp();
  const [preview, setPreview] = useState<DinnerProposal | null>(null);
  const [lastMode, setLastMode] = useState<DinnerMode>('another');
  const [pantryOpen, setPantryOpen] = useState(false);
  const [pantry, setPantry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pantryText = pantry.trim();

  const ask = async (mode: DinnerMode) => {
    setLoading(true);
    setError(null);
    setLastMode(mode);
    try {
      const dinner = await requestDinnerAlternative({
        profile,
        mode,
        pantry: mode === 'pantry' ? pantryText : undefined,
        day: { date: day.date, day: day.day, schoolMeals: day.schoolMeals },
        week: weekDays.map((d) => ({
          date: d.date,
          day: d.day,
          schoolMeals: d.schoolMeals,
          dinner: { dishes: d.dinner.dishes.map((dish) => ({ name: dish.name })) },
        })),
        // Si ya hay una propuesta en pantalla, la nueva debe ser distinta de ella.
        currentDinner: preview ?? day.dinner,
      });
      setPreview(dinner);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const accept = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      await replaceDinner(menuId, weekIndex, dayIndex, preview);
      setPreview(null);
      setPantryOpen(false);
      setPantry('');
    } catch (e) {
      setError((e as Error).message || 'No se ha podido guardar la cena. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {preview ? (
        <Card style={styles.previewCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Propuesta alternativa</Text>
          </View>
          {preview.dishes.map((dish, i) => (
            <View key={i} style={styles.meal}>
              <Text style={styles.dinnerDish}>{dish.name}</Text>
              {dish.description ? <Muted>{dish.description}</Muted> : null}
            </View>
          ))}
          {preview.nutrientFocus.length > 0 && (
            <View style={styles.chips}>
              {preview.nutrientFocus.map((n) => (
                <Chip key={n} label={n} selected />
              ))}
            </View>
          )}
          {preview.rationale ? <Text style={styles.rationale}>{preview.rationale}</Text> : null}
          {preview.tips ? (
            <View style={styles.tip}>
              <Ionicons name="bulb-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.rationale, { flex: 1 }]}>{preview.tips}</Text>
            </View>
          ) : null}
          <View style={styles.actions}>
            <Button
              title="Usar esta cena"
              onPress={accept}
              disabled={loading}
            />
            <Button
              title="Descartar"
              variant="secondary"
              onPress={() => setPreview(null)}
              disabled={loading}
            />
            <Button
              title="Otra receta"
              variant="secondary"
              onPress={() => ask(lastMode)}
              disabled={loading}
            />
          </View>
        </Card>
      ) : pantryOpen ? (
        <View style={styles.actions}>
          <Field
            label="¿Qué tienes en casa?"
            hint="Escribe los ingredientes separados por comas"
            placeholder="pollo, calabacín, arroz, tomate…"
            value={pantry}
            onChangeText={setPantry}
            multiline
            maxLength={PANTRY_MAX_LENGTH}
            editable={!loading}
            accessibilityLabel="Ingredientes que tienes en casa"
          />
          <Button
            title="Proponer cena"
            onPress={() => ask('pantry')}
            disabled={loading || pantryText.length === 0}
          />
          <Button
            title="Cancelar"
            variant="secondary"
            onPress={() => setPantryOpen(false)}
            disabled={loading}
          />
        </View>
      ) : (
        <View style={styles.actions}>
          <Button
            title="Otra receta"
            variant="secondary"
            onPress={() => ask('another')}
            disabled={loading}
          />
          <Button
            title="Cocinar con lo que tengo"
            variant="secondary"
            onPress={() => setPantryOpen(true)}
            disabled={loading}
          />
        </View>
      )}

      {loading && (
        <View style={styles.loading} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.primary} />
          <Muted>Buscando otra cena…</Muted>
        </View>
      )}

      {error ? (
        <View style={styles.error} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={20} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, paddingTop: spacing.sm },
  actions: { gap: spacing.sm },
  previewCard: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.primarySoft },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  meal: { gap: 2, paddingTop: spacing.xs },
  dinnerDish: { fontSize: 16, fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingTop: spacing.xs },
  rationale: { fontSize: 14, color: colors.text, lineHeight: 20 },
  tip: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  error: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 14, lineHeight: 20 },
});
