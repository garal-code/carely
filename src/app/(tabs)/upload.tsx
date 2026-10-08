import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { analyzeMenu, PROVIDER_LABELS } from '../../ai';
import { Button, Card, Muted, SectionTitle } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { normalizeImageMimeType, readAsBase64, stripDataUrl } from '../../lib/files';
import type { MenuFile } from '../../lib/files';
import { colors, radius, spacing } from '../../theme';

function showError(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

export default function UploadScreen() {
  const { profile, settings, apiKeys, addMenu } = useApp();
  const [file, setFile] = useState<MenuFile | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const apiKey = apiKeys[settings.provider];

  async function pickImage(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showError('Permiso denegado', 'Necesitamos acceso para poder leer el menú.');
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    };
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;
    const asset = result.assets[0];
    setFile({
      kind: 'image',
      name: asset.fileName ?? 'menu.jpg',
      mimeType: normalizeImageMimeType(asset.mimeType),
      base64: asset.base64 ? stripDataUrl(asset.base64) : await readAsBase64(asset.uri),
      uri: asset.uri,
    });
  }

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      base64: true, // solo afecta a web
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setFile({
      kind: 'pdf',
      name: asset.name,
      mimeType: 'application/pdf',
      base64: asset.base64 ? stripDataUrl(asset.base64) : await readAsBase64(asset.uri),
      uri: asset.uri,
    });
  }

  async function analyze() {
    if (!file) return;
    if (!apiKey) {
      showError('Falta la clave de API', `Configura tu clave de ${PROVIDER_LABELS[settings.provider]} en Ajustes.`);
      return;
    }
    setAnalyzing(true);
    try {
      const menu = await analyzeMenu({ file, profile, settings, apiKey });
      await addMenu(menu);
      setFile(null);
      router.navigate('/');
    } catch (error) {
      showError('No se ha podido analizar el menú', (error as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <SectionTitle>Menú de la guardería</SectionTitle>
        <Muted>Haz una foto nítida del menú o sube el PDF que os envía la guardería.</Muted>
        <View style={styles.actions}>
          {Platform.OS !== 'web' && (
            <Button
              title="Hacer foto"
              variant="secondary"
              icon={<Ionicons name="camera-outline" size={20} color={colors.primary} />}
              onPress={() => pickImage(true)}
              disabled={analyzing}
            />
          )}
          <Button
            title="Elegir imagen"
            variant="secondary"
            icon={<Ionicons name="image-outline" size={20} color={colors.primary} />}
            onPress={() => pickImage(false)}
            disabled={analyzing}
          />
          <Button
            title="Elegir PDF"
            variant="secondary"
            icon={<Ionicons name="document-text-outline" size={20} color={colors.primary} />}
            onPress={pickPdf}
            disabled={analyzing}
          />
        </View>
      </Card>

      {file && (
        <Card>
          <SectionTitle>Vista previa</SectionTitle>
          {file.kind === 'image' ? (
            <Image source={{ uri: file.uri }} style={styles.preview} resizeMode="contain" />
          ) : (
            <View style={styles.pdf}>
              <Ionicons name="document-text" size={32} color={colors.accent} />
              <Text style={styles.pdfName} numberOfLines={2}>
                {file.name}
              </Text>
            </View>
          )}
          <Button title="Analizar con IA" onPress={analyze} loading={analyzing} />
          {analyzing ? (
            <Muted>
              {PROVIDER_LABELS[settings.provider]} está leyendo el menú y preparando las cenas. Puede tardar hasta un minuto.
            </Muted>
          ) : (
            <Muted>
              Se enviará a {PROVIDER_LABELS[settings.provider]} junto con el perfil de {profile.name.trim() || 'tu hijo'}.
            </Muted>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  actions: { gap: spacing.sm, paddingTop: spacing.sm },
  preview: {
    width: '100%',
    height: 320,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  pdf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  pdfName: { flex: 1, fontSize: 15, color: colors.text },
});
