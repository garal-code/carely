import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Field, Muted, SectionTitle } from '../../components/ui';
import { DIET_LABELS, EU_ALLERGENS } from '../../constants';
import { useApp } from '../../context/AppContext';
import { describeAge, parseBirthDate } from '../../lib/age';
import { spacing } from '../../theme';
import type { ChildProfile, Diet } from '../../types';

export default function ProfileScreen() {
  const { profile, updateProfile } = useApp();
  const [draft, setDraft] = useState<ChildProfile>(profile);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof ChildProfile>(key: K, value: ChildProfile[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const toggleAllergy = (allergen: string) =>
    set(
      'allergies',
      draft.allergies.includes(allergen)
        ? draft.allergies.filter((a) => a !== allergen)
        : [...draft.allergies, allergen],
    );

  const birthDateInvalid = draft.birthDate.trim() !== '' && !parseBirthDate(draft.birthDate);
  const age = describeAge(draft.birthDate);

  async function save() {
    await updateProfile({ ...draft, birthDate: draft.birthDate.trim() });
    setSaved(true);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <SectionTitle>Datos básicos</SectionTitle>
        <Field label="Nombre" value={draft.name} onChangeText={(v) => set('name', v)} placeholder="Ej. Lucía" />
        <Field
          label="Fecha de nacimiento"
          value={draft.birthDate}
          onChangeText={(v) => set('birthDate', v)}
          placeholder="AAAA-MM-DD"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          hint={birthDateInvalid ? 'Usa el formato AAAA-MM-DD, p. ej. 2023-05-14' : age ? `Edad: ${age}` : undefined}
        />
      </Card>

      <Card>
        <SectionTitle>Alergias e intolerancias</SectionTitle>
        <Muted>La IA nunca propondrá cenas con estos alimentos y te avisará si aparecen en el menú de la guardería.</Muted>
        <View style={styles.chips}>
          {EU_ALLERGENS.map((allergen) => (
            <Chip
              key={allergen}
              label={allergen}
              tone="danger"
              selected={draft.allergies.includes(allergen)}
              onPress={() => toggleAllergy(allergen)}
            />
          ))}
        </View>
        <Field
          label="Otras alergias o intolerancias"
          value={draft.otherAllergies}
          onChangeText={(v) => set('otherAllergies', v)}
          placeholder="Ej. kiwi, lactosa"
        />
      </Card>

      <Card>
        <SectionTitle>Alimentación</SectionTitle>
        <View style={styles.chips}>
          {(Object.keys(DIET_LABELS) as Diet[]).map((diet) => (
            <Chip key={diet} label={DIET_LABELS[diet]} selected={draft.diet === diet} onPress={() => set('diet', diet)} />
          ))}
        </View>
        <Field
          label="Le gusta"
          value={draft.likes}
          onChangeText={(v) => set('likes', v)}
          placeholder="Ej. pasta, merluza, calabacín"
          multiline
        />
        <Field
          label="No le gusta"
          value={draft.dislikes}
          onChangeText={(v) => set('dislikes', v)}
          placeholder="Ej. espinacas, garbanzos"
          multiline
        />
        <Field
          label="Otras notas"
          value={draft.notes}
          onChangeText={(v) => set('notes', v)}
          placeholder="Ej. come mejor los purés, cenamos a las 19:30"
          multiline
        />
      </Card>

      <Button title={saved ? 'Perfil guardado ✓' : 'Guardar perfil'} onPress={save} disabled={birthDateInvalid} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
