import { AudioQuality, IOSOutputFormat, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState, type RecordingOptions } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

// Talking to the assistant on the phone. Expo Go has no speech recognition, so this
// records one request and hands the file over; the backend writes it down. The
// microphone's level tells when the person started and stopped talking, so they
// never have to press "done" (where a phone doesn't report levels, they tap once).

// Speech, not music: one channel at 16 kHz is all a transcriber needs, and keeps a
// ten-second request near 40 KB on a mobile connection.
const SPEECH: RecordingOptions = {
    extension: '.m4a',
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
    isMeteringEnabled: true,
    android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
    ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MEDIUM, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
    web: { mimeType: 'audio/webm', bitsPerSecond: 32000 },
};

/** Louder than this (dBFS) is someone talking; a quiet room sits around -50 to -60 */
const SPEECH_DB = -38;
/** A pause this long after talking ends the request */
const SILENCE_MS = 1300;
/** Nothing said for this long: stop, send nothing */
const NO_SPEECH_MS = 8000;
/** Nobody gives a shift in a minute; a stuck microphone shouldn't record forever */
const MAX_MS = 30000;
/** Shorter than this is a tap, not a request */
const MIN_MS = 600;
const POLL_MS = 100;

export type RecorderError = 'blocked' | 'failed';

/**
 * One spoken request at a time. `onRecording` gets the file once the person has
 * stopped talking (or tapped). `level` (0–1) drives the microphone's halo;
 * `quiet` says the last listen heard nothing; `tapToSend` means this phone gives no
 * levels, so the person taps when done.
 */
export function useVoiceRecorder({ onRecording }: { onRecording: (uri: string) => void }) {
    const recorder = useAudioRecorder(SPEECH);
    const state = useAudioRecorderState(recorder, POLL_MS);
    const [listening, setListening] = useState(false);
    const [error, setError] = useState<RecorderError | null>(null);
    const [quiet, setQuiet] = useState(false);
    const [tapToSend, setTapToSend] = useState(false);
    const level = useSharedValue(0);
    const talk = useRef({ startedAt: 0, heard: false, lastLoud: 0, finishing: false });
    const latest = useRef(onRecording);
    useEffect(() => {
        latest.current = onRecording;
    });

    const finish = useCallback(
        async (send: boolean) => {
            if (talk.current.finishing) return;
            talk.current.finishing = true;
            const length = Date.now() - talk.current.startedAt;
            try {
                await recorder.stop();
            } catch {
                // Already stopped
            }
            // Recording mode sends iOS playback to the earpiece; the reply must come from the speaker
            await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
            setListening(false);
            level.set(withTiming(0, { duration: 150 }));
            if (send && recorder.uri && length >= MIN_MS) latest.current(recorder.uri);
        },
        [recorder, level]
    );

    const start = useCallback(async () => {
        setError(null);
        setQuiet(false);
        try {
            const { granted } = await requestRecordingPermissionsAsync();
            if (!granted) {
                setError('blocked');
                return;
            }
            await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
            await recorder.prepareToRecordAsync();
            recorder.record();
            talk.current = { startedAt: Date.now(), heard: false, lastLoud: 0, finishing: false };
            setTapToSend(false);
            setListening(true);
        } catch {
            setError('failed');
        }
    }, [recorder]);

    /** The mic button while listening: send what was said, or just stop when nothing was */
    const tap = useCallback(() => finish(talk.current.heard || tapToSend), [finish, tapToSend]);
    const cancel = useCallback(() => finish(false), [finish]);

    // Every level reading: is someone talking, and have they stopped?
    useEffect(() => {
        if (!listening || !state.isRecording) return;
        const now = Date.now();
        const elapsed = now - talk.current.startedAt;
        if (state.metering === undefined) {
            // This phone gives no levels: the person taps when done
            if (elapsed > 1000 && !tapToSend) setTapToSend(true);
            if (elapsed > MAX_MS) void finish(true);
            return;
        }
        level.set(withTiming(Math.min(1, Math.max(0, (state.metering + 60) / 45)), { duration: POLL_MS }));
        if (state.metering > SPEECH_DB) {
            talk.current.heard = true;
            talk.current.lastLoud = now;
        }
        if (talk.current.heard && now - talk.current.lastLoud > SILENCE_MS) void finish(true);
        else if (!talk.current.heard && elapsed > NO_SPEECH_MS) {
            setQuiet(true);
            void finish(false);
        } else if (elapsed > MAX_MS) void finish(true);
    }, [listening, state.isRecording, state.metering, state.durationMillis, tapToSend, finish, level]);

    return { listening, level, error, quiet, tapToSend, start, tap, cancel };
}
