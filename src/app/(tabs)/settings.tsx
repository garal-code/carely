import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PROVIDER_LABELS } from '../../ai';
import { Button, Card, Chip, Field, Muted, SectionTitle } from '../../components/ui';
import { CLAUDE_MODELS, OPENAI_MODEL_SUGGESTIONS } from '../../constants';
import { useApp } from '../../context/AppContext';
import { colors, spacing } from '../../theme';
import type { AIProvider } from '../../types';

const KEY_URLS: Record<AIProvider, string> = {
  claude: 'https://platform.claude.com/settings/keys',
  openai: 'https://platform.openai.com/api-keys',
};

function maskKey(key: string) {
  return key.length <= 8 ? '••••' : `${key.slice(0, 7)}…${key.slice(-4)}`;
}

export default function SettingsScreen() {
  const { settings, updateSettings, apiKeys, updateApiKey } = useApp();
  const provider = settings.provider;
  const [keyDraft, setKeyDraft] = useState('');
  const [openaiModelDraft, setOpenaiModelDraft] = useState(settings.openaiModel);

  useEffect(() => setKeyDraft(''), [provider]);

  const savedKey = apiKeys[provider];

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <SectionTitle>Proveedor de IA</SectionTitle>
        <Muted>Elige qué inteligencia artificial leerá los menús y propondrá las cenas.</Muted>
        <View style={styles.chips}>
          {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map((p) => (
            <Chip
              key={p}
              label={PROVIDER_LABELS[p]}
              selected={provider === p}
              onPress={() => updateSettings({ ...settings, provider: p })}
            />
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle>Clave de API de {PROVIDER_LABELS[provider]}</SectionTitle>
        <Muted>
          Las suscripciones de chat (Claude Pro, ChatGPT Plus) no incluyen acceso a la API: necesitas una clave de
          API de la plataforma de desarrolladores, con saldo de pago por uso. La clave se guarda cifrada solo en este
          dispositivo.
        </Muted>
        <Text style={styles.link} onPress={() => Linking.openURL(KEY_URLS[provider])}>
          Obtener una clave →
        </Text>
        {savedKey ? (
          <View style={styles.savedKey}>
            <Text style={styles.savedKeyText}>Clave guardada: {maskKey(savedKey)}</Text>
            <Text style={[styles.link, { color: colors.danger }]} onPress={() => updateApiKey(provider, '')}>
              Eliminar
            </Text>
          </View>
        ) : null}
        <Field
          label={savedKey ? 'Sustituir clave' : 'Clave'}
          value={keyDraft}
          onChangeText={setKeyDraft}
          placeholder={provider === 'claude' ? 'sk-ant-…' : 'sk-…'}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button
          title="Guardar clave"
          disabled={!keyDraft.trim()}
          onPress={async () => {
            await updateApiKey(provider, keyDraft);
            setKeyDraft('');
          }}
        />
      </Card>

      <Card>
        <SectionTitle>Modelo</SectionTitle>
        {provider === 'claude' ? (
          <View style={styles.chips}>
            {CLAUDE_MODELS.map((m) => (
              <Chip
                key={m.id}
                label={m.label}
                selected={settings.claudeModel === m.id}
                onPress={() => updateSettings({ ...settings, claudeModel: m.id })}
              />
            ))}
          </View>
        ) : (
          <>
            <View style={styles.chips}>
              {OPENAI_MODEL_SUGGESTIONS.map((id) => (
                <Chip
                  key={id}
                  label={id}
                  selected={settings.openaiModel === id}
                  onPress={() => {
                    setOpenaiModelDraft(id);
                    updateSettings({ ...settings, openaiModel: id });
                  }}
                />
              ))}
            </View>
            <Field
              label="Otro modelo"
              value={openaiModelDraft}
              onChangeText={setOpenaiModelDraft}
              onEndEditing={() =>
                openaiModelDraft.trim() && updateSettings({ ...settings, openaiModel: openaiModelDraft.trim() })
              }
              autoCapitalize="none"
              autoCorrect={false}
              hint="Debe admitir imágenes, PDF y salidas estructuradas."
            />
          </>
        )}
      </Card>

      <Muted>
        Las propuestas de la IA son orientativas y no sustituyen el consejo de tu pediatra, especialmente en caso de
        alergias.
      </Muted>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  link: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  savedKey: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: 8,
  },
  savedKeyText: { color: colors.text, fontSize: 14 },
});
