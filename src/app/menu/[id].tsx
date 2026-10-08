import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, ScrollView, StyleSheet } from 'react-native';

import { MenuView } from '../../components/MenuView';
import { Button, Card, Muted } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { PROVIDER_LABELS } from '../../lib/api';
import { spacing } from '../../theme';

export default function MenuDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { menus, deleteMenu } = useApp();
  const menu = menus.find((m) => m.id === id);

  if (!menu) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Muted>Este menú ya no existe.</Muted>
        </Card>
      </ScrollView>
    );
  }

  const remove = async () => {
    await deleteMenu(menu.id);
    router.back();
  };

  const confirmDelete = () => {
    const message = '¿Seguro que quieres borrar este menú?';
    if (Platform.OS === 'web') {
      if (window.confirm(message)) remove();
      return;
    }
    Alert.alert('Borrar menú', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: remove },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: menu.weekLabel || 'Menú semanal' }} />
      <MenuView menu={menu} />
      <Muted>
        Analizado con {PROVIDER_LABELS[menu.provider] ?? 'IA'} a partir de «{menu.source.name}».
      </Muted>
      <Button title="Borrar menú" variant="danger" onPress={confirmDelete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
});
