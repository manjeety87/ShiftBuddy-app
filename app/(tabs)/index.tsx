import { GettingStarted } from "@/components/GettingStarted";
import { NoShiftsCard } from "@/components/NoShiftsCard";
import { UpcomingShiftCard } from "@/components/UpcomingShiftCard";
import { router, useFocusEffect } from "expo-router";
import { Plus, Repeat, ScanLine } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { ClockedInCard } from "../../components/ClockedInCard";
import { ConflictBanner } from "../../components/ConflictBanner";
import { DayShifts } from "../../components/DayShifts";
import { IconButton, TextButton } from "../../components/ui/Button";
import { PressableScale } from "../../components/ui/PressableScale";
import { Screen, useScreenTopInset } from "../../components/ui/Screen";
import { ThemedText } from "../../components/ui/ThemedText";
import { WeekDateStrip } from "../../components/WeekDateStrip";
import { radius, spacing } from "../../constants/themes";
import { useAuth } from "../../lib/auth-context";
import { withAlpha } from "../../lib/color";
import { getConflicts } from "../../lib/conflicts";
import { getWeekDays, groupJobColorsByDate } from "../../lib/dateUtils";
import { addDays } from "../../lib/daySegments";
import { showAlert } from "../../lib/dialog";
import { motion } from "../../lib/motion";
import { notify } from "../../lib/notify";
import { useOnboarding } from "../../lib/onboarding";
import { useShiftsChanged } from "../../lib/shiftEvents";
import { copyShifts, getMyShifts } from "../../lib/shifts";
import { useTheme } from "../../lib/theme-context";
import { getCurrentEntry, useTimesheetChanged } from "../../lib/timesheet";
import { useFetch } from "../../lib/useFetch";
import { useMyJobs } from "../../lib/useMyJobs";
import { useNow } from "../../lib/useNow";

const DAY_MS = 24 * 60 * 60 * 1000;
// How far back Home looks to tell whether someone has clocked in before
const RECENT_DAYS = 28;

export default function HomeScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const topInset = useScreenTopInset();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  // One extra day back so an overnight shift ending on the first day still shows up.
  // addDays copies — never mutate weekDays, the strip renders from it.
  const weekFrom = addDays(weekDays[0], -1).toISOString();
  const weekTo = addDays(weekDays[6], 1).toISOString();

  const {
    data: weekShifts,
    refetch: refetchWeek,
    refresh: refreshWeek,
    isRefreshing,
  } = useFetch(
    () => getMyShifts({ from: weekFrom, to: weekTo }),
    [weekFrom, weekTo],
  );

  const {
    data: upcomingShifts,
    refetch: refetchUpcoming,
    refresh: refreshUpcoming,
  } = useFetch(() =>
    // From a day back, so a shift that has already started (and may need clocking in) is in the list too
    getMyShifts({ from: new Date(Date.now() - DAY_MS).toISOString() }),
  );
  const { data: clockedIn, refetch: refetchClockedIn } =
    useFetch(getCurrentEntry);
  // For the "Getting started" card only: hours clocked lately tick its last step
  const { data: recentShifts, refetch: refetchRecent } = useFetch(() =>
    getMyShifts({
      from: new Date(Date.now() - RECENT_DAYS * DAY_MS).toISOString(),
      to: new Date().toISOString(),
    }),
  );
  const { data: jobs } = useMyJobs();
  const onboarding = useOnboarding();

  // A brand-new account (no job yet) gets the welcome once on this phone;
  // people who already use the app never see it
  useEffect(() => {
    if (jobs?.length !== 0 || !onboarding || onboarding.welcomeSeen) return;
    router.push("/welcome");
  }, [jobs?.length, onboarding]);
  useTimesheetChanged(refetchClockedIn);
  const now = useNow();

  // Overlaps + travel-time conflicts from the backend; routing lookups make it slower, so it loads independently
  const { data: conflicts, refetch: refetchConflicts } = useFetch(getConflicts);

  useFocusEffect(
    useCallback(() => {
      refetchWeek();
      refetchUpcoming();
      refetchConflicts();
      refetchClockedIn();
      refetchRecent();
    }, [
      refetchWeek,
      refetchUpcoming,
      refetchConflicts,
      refetchClockedIn,
      refetchRecent,
    ]),
  );
  useShiftsChanged(() => {
    refetchWeek();
    refetchUpcoming();
    refetchConflicts();
    refetchRecent();
  });

  // One dot per job on each day of the strip
  const jobColorsByDate = useMemo(
    () => groupJobColorsByDate(weekShifts ?? []),
    [weekShifts],
  );
  // The fetch reaches a day back (for overnight shifts ending Sunday morning), so
  // "this week's shifts" — what gets copied and counted — are only those starting in it.
  const shiftsThisWeek = useMemo(() => {
    const weekStart = weekDays[0].getTime();
    const weekEnd = addDays(weekDays[6], 1).getTime();
    return (weekShifts ?? []).filter((shift) => {
      const start = Date.parse(shift.startTime);
      return start >= weekStart && start < weekEnd;
    });
  }, [weekShifts, weekDays]);

  // What the top card is about: a shift that has started and isn't clocked in yet, else the next one to come
  const startedShift = upcomingShifts?.find(
    (shift) =>
      Date.parse(shift.startTime) <= now &&
      Date.parse(shift.endTime) > now &&
      shift.id !== clockedIn?.shiftId,
  );
  const nextShift =
    startedShift ??
    upcomingShifts?.find((shift) => Date.parse(shift.startTime) > now);

  const weekLabel = (offsetDays: number) => {
    const move = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate() + offsetDays);
    const format = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${format(move(weekDays[0]))} – ${format(move(weekDays[6]))}`;
  };

  const copyWeekToNext = async () => {
    if (!shiftsThisWeek.length) return;
    try {
      const { created, skipped } = await copyShifts({
        shiftIds: shiftsThisWeek.map((s) => s.id),
        offsetDays: 7,
      });
      const skippedNote =
        skipped.length > 0
          ? `\n${skipped.length} skipped — already on next week's schedule.`
          : "";
      const added = `${created.length} shift${created.length !== 1 ? "s" : ""} copied to ${weekLabel(7)}`;
      if (created.length > 0)
        notify.success(added, { description: skippedNote.trim() || undefined });
      else
        notify.info("Nothing copied", {
          description: skippedNote.trim() || undefined,
        });
      refetchUpcoming();
      refetchConflicts();
    } catch (err: any) {
      showAlert(
        "Could not copy week",
        err?.response?.data?.message || "Something went wrong.",
      );
    }
  };

  const handleCopyWeek = () => {
    if (!shiftsThisWeek.length) return;
    const count = shiftsThisWeek.length;
    showAlert(
      "Copy to next week?",
      `${count} shift${count !== 1 ? "s" : ""} from ${weekLabel(0)} will be copied to ${weekLabel(7)} at the same times. Any that clash with shifts already there are skipped.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Copy", onPress: copyWeekToNext },
      ],
    );
  };

  // Known only once both lists have loaded; until then Home shows neither card
  const hasNoUpcomingShifts = !!upcomingShifts && !nextShift && !clockedIn;
  // Nothing coming up and nothing this week either: most likely a brand-new account
  const isFirstTime =
    hasNoUpcomingShifts && weekShifts !== null && shiftsThisWeek.length === 0;
  // "Next week" only makes sense while this week isn't over
  const canRepeatWeek = shiftsThisWeek.length > 0;

  // Each step is read from the data, so a tick means it's really done
  const progress = {
    hasJob: !!jobs?.length,
    hasShift: !!(
      upcomingShifts?.length ||
      weekShifts?.length ||
      recentShifts?.length
    ),
    hasHome: !!user?.homeLocation,
    hasClockedIn:
      !!clockedIn ||
      !!recentShifts?.some((shift) => shift.timeEntries?.length),
  };
  // Waits for everything it reads, so the card never appears and then vanishes
  const showGuide =
    !!onboarding &&
    !onboarding.guideHidden &&
    !Object.values(progress).every(Boolean) &&
    jobs !== null &&
    upcomingShifts !== null &&
    recentShifts !== null;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topInset,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xl,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              refreshWeek();
              refreshUpcoming();
              refetchConflicts();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Greeting on the left; the two ways to add shifts on the right, same place and icons as the Shifts tab */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          <View style={{ flex: 1 }}>
            <ThemedText size="2xl" weight="bold" numberOfLines={1}>
              Hey, {user?.name?.split(" ")[0]} 👋
            </ThemedText>
            <ThemedText variant="muted" numberOfLines={1}>
              Here’s what’s coming up
            </ThemedText>
          </View>
          {/* While the "no shifts" card is up it carries these two actions itself */}
          {!hasNoUpcomingShifts && (
            <>
              <IconButton
                icon={ScanLine}
                accessibilityLabel="Scan a schedule"
                onPress={() => router.push("/import-schedule")}
                size={40}
              />
              <PressableScale
                onPress={() => router.push("/create-shift")}
                accessibilityRole="button"
                accessibilityLabel="Add a shift"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  height: 40,
                  paddingLeft: 12,
                  paddingRight: 16,
                  borderRadius: radius.full,
                  backgroundColor: colors.primary,
                }}
              >
                <Plus color={colors.onPrimary} size={18} />
                <ThemedText
                  color={colors.onPrimary}
                  size="sm"
                  weight="semibold"
                >
                  Add
                </ThemedText>
              </PressableScale>
            </>
          )}
        </View>

        <Animated.View layout={motion.layout}>
          <View style={{ marginBottom: spacing.sm }}>
            <ThemedText weight="semibold">This week</ThemedText>
            <ThemedText variant="muted" size="xs">
              {weekLabel(0)}
            </ThemedText>
          </View>

          <View style={{ marginBottom: spacing.lg }}>
            <WeekDateStrip
              days={weekDays}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
              jobColorsByDate={jobColorsByDate}
            />
          </View>

          <ConflictBanner
            overlaps={conflicts?.overlaps ?? []}
            travel={conflicts?.travel ?? []}
          />
          {/* Top of Home: the next shift whenever it is — or, when there is none, how to add one */}
          {clockedIn && <ClockedInCard entry={clockedIn} />}
          {showGuide && <GettingStarted progress={progress} />}
          {nextShift ? (
            <UpcomingShiftCard shift={nextShift} isClockedIn={!!clockedIn} />
          ) : hasNoUpcomingShifts && !showGuide ? (
            <NoShiftsCard isFirstTime={isFirstTime} />
          ) : null}

          <DayShifts
            day={selectedDate}
            shifts={weekShifts ?? []}
            onPressShift={(shift) => router.push(`/edit-shift/${shift.id}`)}
          />

          {/* Asked as a question with the result spelled out — a bare "Copy to next" button meant nothing to a new user */}
          {canRepeatWeek && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
                marginTop: spacing.lg,
                padding: spacing.md,
                borderRadius: radius.lg,
                backgroundColor: colors.surface,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: withAlpha(colors.primary, 0.12),
                }}
              >
                <Repeat color={colors.primary} size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText size="sm" weight="semibold">
                  Same shifts next week?
                </ThemedText>
                <ThemedText variant="muted" size="xs">
                  Copy{" "}
                  {shiftsThisWeek.length === 1
                    ? "this shift"
                    : `these ${shiftsThisWeek.length} shifts`}{" "}
                  to {weekLabel(7)}
                </ThemedText>
              </View>
              <TextButton
                label="Copy"
                onPress={handleCopyWeek}
                accessibilityLabel="Copy this week’s shifts to next week"
              />
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
