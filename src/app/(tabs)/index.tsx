import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MenuView } from '../../components/MenuView';
import { Button, Card, Muted, SectionTitle } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, spacing } from '../../theme';

export default function WeekScreen() {
  const { menus, profile } = useApp();
  const [latest, ...previous] = menus;
  const hasProfile = profile.name.trim().length > 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {!hasProfile && (
        <Card>
          <SectionTitle>Primeros pasos</SectionTitle>
          <SetupStep done={hasProfile} label="Completa el perfil de tu hijo" onPress={() => router.navigate('/profile')} />
          <SetupStep done={false} label="Sube el menú de la guardería" onPress={() => router.navigate('/upload')} />
        </Card>
      )}

      {latest ? (
        <>
          <View>
            <Text style={styles.title}>{latest.weekLabel || 'Menú de la semana'}</Text>
            {hasProfile ? <Muted>Cenas pensadas para {profile.name.trim()}</Muted> : null}
            <Text style={styles.link} onPress={() => router.push(`/menu/${latest.id}`)}>
              Ver detalles
            </Text>
          </View>
          <MenuView key={latest.id} menu={latest} />
        </>
      ) : (
        <Card style={styles.empty}>
          <Ionicons name="restaurant-outline" size={40} color={colors.primary} />
          <SectionTitle>Todavía no hay menús</SectionTitle>
          <Muted>
            Haz una foto o sube el PDF del menú de la guardería y te propondremos una cena equilibrada para cada día.
          </Muted>
          <Button title="Subir menú" onPress={() => router.navigate('/upload')} />
        </Card>
      )}

      {previous.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <SectionTitle>Semanas anteriores</SectionTitle>
          {previous.map((menu) => (
            <Pressable key={menu.id} onPress={() => router.push(`/menu/${menu.id}`)}>
              <Card style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{menu.weekLabel || 'Menú semanal'}</Text>
                  <Muted>Subido el {new Date(menu.createdAt).toLocaleDateString('es-ES')}</Muted>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function SetupStep({ done, label, onPress }: { done: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.step}>
      <Ionicons
        name={done ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={done ? colors.primary : colors.textMuted}
      />
      <Text style={[styles.stepText, done && styles.stepDone]}>{label}</Text>
      {!done && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  link: { color: colors.primary, fontWeight: '600', fontSize: 14, paddingTop: spacing.xs },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  stepText: { flex: 1, fontSize: 15, color: colors.text },
  stepDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
});
