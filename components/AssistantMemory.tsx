import { X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { radius, spacing } from '../constants/themes';
import { deleteAssistantNote, forgetAssistantMemory, getAssistantMemory } from '../lib/assistant';
import { showAlert } from '../lib/dialog';
import { notify } from '../lib/notify';
import { useTheme } from '../lib/theme-context';
import { useFetch } from '../lib/useFetch';
import { TextButton } from './ui/Button';
import { PressableScale } from './ui/PressableScale';
import { ThemedText } from './ui/ThemedText';

/**
 * Under the Remember assistant chats switch, while it's on: what the assistant noted
 * (each can go), and one action that deletes every kept line and note.
 */
export function AssistantMemory() {
    const { colors } = useTheme();
    const { data, isLoading, error, refetch } = useFetch(getAssistantMemory, []);
    const [busy, setBusy] = useState<string | null>(null);

    const removeNote = async (noteId: string) => {
        setBusy(noteId);
        try {
            await deleteAssistantNote(noteId);
            await refetch();
        } catch (err: any) {
            notify.error('Couldn’t delete that note', { description: err?.response?.data?.message });
        } finally {
            setBusy(null);
        }
    };

    const forgetAll = () =>
        showAlert('Delete chats and notes?', 'The assistant forgets your conversation and everything it noted, on your phone and the web. Remembering stays on for new chats.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    setBusy('all');
                    try {
                        await forgetAssistantMemory();
                        await refetch();
                        notify.success('Chats and notes deleted');
                    } catch (err: any) {
                        notify.error('Couldn’t delete them', { description: err?.response?.data?.message });
                    } finally {
                        setBusy(null);
                    }
                },
            },
        ]);

    if (isLoading) return <ActivityIndicator color={colors.textMuted} style={{ marginBottom: spacing.lg }} accessibilityLabel="Loading what the assistant kept" />;
    if (error || !data) return <ThemedText variant="secondary" size="sm" style={{ marginBottom: spacing.lg, marginLeft: 4 }}>Couldn’t load what the assistant kept.</ThemedText>;

    const kept = data.messages.length;
    return (
        <View style={{ marginBottom: spacing.lg, gap: spacing.sm }}>
            <ThemedText variant="secondary" size="sm" style={{ marginLeft: 4 }}>
                {data.notes.length === 0 ? 'No notes yet — tell the assistant something to remember.' : 'Notes'}
            </ThemedText>
            {data.notes.length > 0 && (
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
                    {data.notes.map((note, index) => (
                        <View key={note.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingLeft: spacing.md, paddingRight: spacing.sm, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.surfaceLight }}>
                            <ThemedText style={{ flex: 1 }}>{note.text}</ThemedText>
                            <PressableScale onPress={() => void removeNote(note.id)} disabled={busy !== null} accessibilityRole="button" accessibilityLabel={`Delete note: ${note.text}`} hitSlop={8} style={{ padding: 6, opacity: busy !== null ? 0.45 : 1 }}>
                                <X color={colors.textSecondary} size={16} />
                            </PressableScale>
                        </View>
                    ))}
                </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 4 }}>
                <ThemedText variant="secondary" size="sm">{kept === 0 ? 'No conversation kept.' : `${kept} ${kept === 1 ? 'line' : 'lines'} of conversation kept.`}</ThemedText>
                <TextButton label="Delete Chats & Notes" color={colors.danger} weight="medium" disabled={(kept === 0 && data.notes.length === 0) || busy !== null} onPress={forgetAll} />
            </View>
        </View>
    );
}
