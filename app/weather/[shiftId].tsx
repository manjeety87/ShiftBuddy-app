import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, CloudOff, Droplets, Flame, Snowflake, ThermometerSnowflake, TriangleAlert, Umbrella, Wind, Zap, type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Button, TextButton } from '../../components/ui/Button';
import { SheetHeader } from '../../components/ui/SheetHeader';
import { WeatherGlyph } from '../../components/WeatherGlyph';
import { ThemedText } from '../../components/ui/ThemedText';
import { radius, spacing } from '../../constants/themes';
import type { Shift } from '../../interfaces/shift.d';
import { withAlpha } from '../../lib/color';
import { formatDate, formatTime } from '../../lib/dateUtils';
import { getShiftById } from '../../lib/shifts';
import { useTheme } from '../../lib/theme-context';
import { useFetch } from '../../lib/useFetch';
import { formatDegrees, getShiftWeather, type AdviceKind, type ShiftWeather, type WeatherHour, type WeatherUnavailableReason } from '../../lib/weather';

const ADVICE_ICONS: Record<AdviceKind, LucideIcon> = {
    storm: Zap,
    ice: TriangleAlert,
    snow: Snowflake,
    rain: Umbrella,
    cold: ThermometerSnowflake,
    heat: Flame,
    wind: Wind,
    fine: CircleCheck,
};

const hourLabel = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric' });

/** Why there's no forecast, in words — and the one thing that would fix it, when there is one. */
const unavailableCopy = (reason: WeatherUnavailableReason, shift: Shift): { title: string; detail: string; action?: { label: string; href: string } } => {
    switch (reason) {
        case 'NO_LOCATION':
            return {
                title: 'Where is this job?',
                detail: 'Pin the job on the map (or add your home address) and the forecast for your shift shows up here.',
                action: { label: 'Set Job Location', href: `/edit-job/${shift.jobId}` },
            };
        case 'TOO_FAR_AHEAD':
            return { title: 'Too early to tell', detail: 'Forecasts reach about two weeks ahead. Check back closer to the shift.' };
        case 'SHIFT_OVER':
            return { title: 'This shift is over', detail: 'Weather is shown for shifts that are still to come.' };
        default:
            return { title: 'Weather isn’t loading right now', detail: 'The forecast service didn’t answer. Try again in a minute.' };
    }
};

/** Weather for one shift: what it'll be like, what to wear or bring, and the hours around it. */
export default function ShiftWeatherScreen() {
    const { colors } = useTheme();
    const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
    const { data, isLoading, error, refetch } = useFetch(
        async () => {
            const [shift, weather] = await Promise.all([getShiftById(shiftId), getShiftWeather(shiftId)]);
            return { shift, weather };
        },
        [shiftId]
    );

    const card = { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md };

    const message = (title: string, detail: string, action?: React.ReactNode) => (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm }}>
            <CloudOff color={colors.textMuted} size={40} />
            <ThemedText weight="semibold" style={{ textAlign: 'center' }}>{title}</ThemedText>
            <ThemedText variant="secondary" size="sm" style={{ textAlign: 'center', marginBottom: spacing.sm }}>{detail}</ThemedText>
            {action}
        </View>
    );

    const forecast = (shift: Shift, weather: Extract<ShiftWeather, { status: 'ok' }>) => {
        const { atStart, atEnd } = weather;
        const fact = (Icon: LucideIcon, text: string) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon color={colors.textSecondary} size={15} />
                <ThemedText variant="secondary" size="sm">{text}</ThemedText>
            </View>
        );

        return (
            <>
                <View style={{ ...card, marginBottom: spacing.lg }}>
                    <ThemedText variant="muted" size="xs" weight="medium">
                        {weather.place.source === 'job' ? `AT ${weather.place.name.toUpperCase()}` : 'AT HOME — THIS JOB HAS NO PIN YET'} · {formatTime(shift.startTime).toUpperCase()}
                    </ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm }}>
                        <WeatherGlyph hour={atStart} color={colors.primary} size={44} />
                        <View style={{ flex: 1 }}>
                            <ThemedText weight="bold" style={{ fontSize: 40, lineHeight: 44, fontVariant: ['tabular-nums'] }}>{formatDegrees(atStart.temperature)}</ThemedText>
                            <ThemedText variant="secondary" size="sm">{atStart.conditionLabel} · feels like {formatDegrees(atStart.feelsLike)}</ThemedText>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md }}>
                        {fact(Droplets, `${atStart.rainChance}% chance of rain`)}
                        {fact(Wind, `${atStart.windKmh} km/h wind`)}
                    </View>
                    {atEnd && (
                        <ThemedText variant="muted" size="xs" style={{ marginTop: spacing.sm }}>
                            When you finish at {formatTime(shift.endTime)}: {formatDegrees(atEnd.temperature)}, {atEnd.conditionLabel.toLowerCase()}
                        </ThemedText>
                    )}
                </View>

                <ThemedText variant="secondary" size="sm" weight="semibold" style={{ marginBottom: spacing.sm, marginLeft: 4 }}>WHAT TO WEAR OR BRING</ThemedText>
                <View style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: spacing.lg }}>
                    {weather.advice.map((item, i) => {
                        const Icon = ADVICE_ICONS[item.kind];
                        return (
                            <View key={item.title} style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceLight }}>
                                <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(colors.primary, 0.12) }}>
                                    <Icon color={colors.primary} size={18} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <ThemedText weight="semibold">{item.title}</ThemedText>
                                    <ThemedText variant="secondary" size="sm">{item.detail}</ThemedText>
                                </View>
                            </View>
                        );
                    })}
                </View>

                <ThemedText variant="secondary" size="sm" weight="semibold" style={{ marginBottom: spacing.sm, marginLeft: 4 }}>HOUR BY HOUR</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ ...card, padding: 0, marginBottom: spacing.md }} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
                    {weather.hours.map((hour: WeatherHour) => {
                        return (
                            <View key={hour.time} style={{ alignItems: 'center', gap: 6, minWidth: 44 }}>
                                <ThemedText variant="muted" size="xs">{hourLabel(hour.time)}</ThemedText>
                                <WeatherGlyph hour={hour} color={colors.textSecondary} size={20} />
                                <ThemedText size="sm" weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>{formatDegrees(hour.temperature)}</ThemedText>
                                <ThemedText size="xs" color={hour.rainChance >= 30 ? colors.info : colors.textMuted}>{hour.rainChance}%</ThemedText>
                            </View>
                        );
                    })}
                </ScrollView>

                <ThemedText variant="muted" size="xs" style={{ textAlign: 'center', lineHeight: 16 }}>
                    From an hour before your shift to an hour after — % is the chance of rain or snow.{'\n'}Weather by Open-Meteo.
                </ThemedText>
            </>
        );
    };

    const body = () => {
        if (isLoading && !data) return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />;
        if (error && !data) return message('Couldn’t load the weather', error, <TextButton label="Try Again" onPress={refetch} />);
        if (!data) return null;

        const { shift, weather } = data;
        if (weather.status === 'unavailable') {
            const copy = unavailableCopy(weather.reason, shift);
            const action = copy.action
                ? <Button label={copy.action.label} onPress={() => router.replace(copy.action!.href as never)} style={{ alignSelf: 'stretch' }} />
                : weather.reason === 'PROVIDER_DOWN' ? <TextButton label="Try Again" onPress={refetch} /> : undefined;
            return message(copy.title, copy.detail, action);
        }
        return forecast(shift, weather);
    };

    const title = data ? `Weather · ${formatDate(data.shift.startTime)}` : 'Weather';

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SheetHeader title={title} onCancel={() => router.back()} onSave={() => router.back()} saveLabel="Done" hideCancel />
            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>{body()}</ScrollView>
        </View>
    );
}
