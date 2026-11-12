import { useTVFocus } from "@/components/tv/tv-focus"
import { TV, tvSize } from "@/components/tv/tv-scale"
import { Ionicons } from "@/lib/icons/Ionicons"
import { cn } from "@/lib/utils"
import { addDays, format, isSameDay } from "date-fns"
import * as React from "react"
import { Animated, FlatList, Platform, Pressable, Text, View } from "react-native"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export type WeekDayStripProps = {
    weekDays: Date[]
    selectedDate: Date
    currentWeekStart: Date
    canGoPrevWeek: boolean
    canGoNextWeek: boolean
    viewMode: "timeline" | "list" | "grid"
    scope: "all" | "my_list"
    onSelectDate: (date: Date) => void
    onPrevWeek: () => void
    onNextWeek: () => void
    onToday: () => void
    onOpenSettings: () => void
    onOpenMonthPicker: () => void
    onToggleViewMode: () => void
    onToggleScope: () => void
    onRefresh: () => void
    getEventCount: (date: Date) => number
}

export function WeekDayStrip({
    weekDays,
    selectedDate,
    currentWeekStart,
    canGoPrevWeek,
    canGoNextWeek,
    viewMode,
    scope,
    onSelectDate,
    onPrevWeek,
    onNextWeek,
    onToday,
    onOpenSettings,
    onOpenMonthPicker,
    onToggleViewMode,
    onToggleScope,
    onRefresh,
    getEventCount,
}: WeekDayStripProps) {
    const today = new Date()
    const isViewingToday = isSameDay(selectedDate, today)

    const prevWeekFocus = useTVFocus(1.05, "prev-week")
    const nextWeekFocus = useTVFocus(1.05, "next-week")
    const weekRangeFocus = useTVFocus(1.05, "week-range")
    const todayFocus = useTVFocus(1.05, "today")
    const scopeFocus = useTVFocus(1.05, "scope")
    const viewModeFocus = useTVFocus(1.05, "view-mode")
    const refreshFocus = useTVFocus(1.05, "refresh")
    const settingsFocus = useTVFocus(1.05, "settings")

    const weekRangeLabel = React.useMemo(() => {
        const start = currentWeekStart
        const end = addDays(currentWeekStart, 6)
        if (start.getFullYear() === end.getFullYear()) {
            if (start.getMonth() === end.getMonth()) {
                return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`
            }
            return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`
        }
        return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`
    }, [currentWeekStart])

    return (
        <View className="mb-2">
            {/* Header: Week navigation + tools */}
            <View
                className="flex-row items-center justify-between py-2"
                style={{ paddingHorizontal: Platform.isTV ? TV.gutter : 16 }}
            >
                {/* Left: Previous week button */}
                <Pressable
                    onPress={onPrevWeek}
                    disabled={!canGoPrevWeek}
                    hitSlop={12}
                    onFocus={prevWeekFocus.focus}
                    onBlur={prevWeekFocus.blur}
                    className={cn(
                        "flex-row items-center gap-1 rounded-lg px-2 py-1.5",
                        canGoPrevWeek ? "active:bg-white/10" : "opacity-30",
                        Platform.isTV && prevWeekFocus.focused && "border-white border-2",
                    )}
                >
                    <Ionicons name="chevron-back" size={18} color="white" />
                    {!Platform.isTV && (
                        <Text className="text-xs font-medium text-white/70">Prev</Text>
                    )}
                </Pressable>

                {/* Center: Week range label / month picker */}
                <Pressable
                    onPress={onOpenMonthPicker}
                    hitSlop={8}
                    onFocus={weekRangeFocus.focus}
                    onBlur={weekRangeFocus.blur}
                    className={cn(
                        "flex-row items-center gap-1.5 rounded-lg px-2.5 py-1 active:bg-white/10",
                        Platform.isTV && weekRangeFocus.focused && "border-white border-2",
                    )}
                >
                    <Ionicons name="calendar-outline" size={15} color="rgba(255,255,255,0.7)" />
                    <Text className="text-sm font-bold text-white/95">
                        {weekRangeLabel}
                    </Text>
                </Pressable>

                {/* Right controls */}
                <View className="flex-row items-center gap-1">
                    {/* Next week button */}
                    <Pressable
                        onPress={onNextWeek}
                        disabled={!canGoNextWeek}
                        hitSlop={12}
                        onFocus={nextWeekFocus.focus}
                        onBlur={nextWeekFocus.blur}
                        className={cn(
                            "flex-row items-center gap-1 rounded-lg px-2 py-1.5",
                            canGoNextWeek ? "active:bg-white/10" : "opacity-30",
                            Platform.isTV && nextWeekFocus.focused && "border-white border-2",
                        )}
                    >
                        {!Platform.isTV && (
                            <Text className="text-xs font-medium text-white/70">Next</Text>
                        )}
                        <Ionicons name="chevron-forward" size={18} color="white" />
                    </Pressable>

                    {/* Today button */}
                    <Pressable
                        onPress={onToday}
                        hitSlop={10}
                        onFocus={todayFocus.focus}
                        onBlur={todayFocus.blur}
                        className={cn(
                            "rounded-lg p-1.5",
                            Platform.isTV && todayFocus.focused && "border-white border-2",
                            !isViewingToday ? "bg-brand-500/20 active:bg-brand-500/35" : "active:bg-white/10",
                        )}
                    >
                        <Ionicons
                            name="today-outline"
                            size={18}
                            color={!isViewingToday ? "rgb(184, 176, 255)" : "rgba(255,255,255,0.7)"}
                        />
                    </Pressable>

                    {/* Scope toggle (All vs My List) */}
                    <Pressable
                        onPress={onToggleScope}
                        hitSlop={10}
                        onFocus={scopeFocus.focus}
                        onBlur={scopeFocus.blur}
                        className={cn(
                            "flex-row items-center gap-1.5 rounded-lg px-2.5 py-1.5",
                            Platform.isTV && scopeFocus.focused && "border-white border-2",
                            scope === "all" ? "bg-brand-500/20 active:bg-brand-500/35" : "bg-white/[0.06] active:bg-white/10",
                        )}
                    >
                        <Ionicons
                            name={scope === "all" ? "globe-outline" : "bookmark-outline"}
                            size={15}
                            color={scope === "all" ? "rgb(184, 176, 255)" : "rgba(255,255,255,0.7)"}
                        />
                        <Text
                            className={cn(
                                "text-xs font-semibold",
                                scope === "all" ? "text-brand-300" : "text-white/70",
                            )}
                        >
                            {scope === "all" ? "All" : "My List"}
                        </Text>
                    </Pressable>

                    {/* View mode toggle (Timeline vs List vs Grid) */}
                    <Pressable
                        onPress={onToggleViewMode}
                        hitSlop={10}
                        onFocus={viewModeFocus.focus}
                        onBlur={viewModeFocus.blur}
                        className={cn(
                            "rounded-lg p-1.5 active:bg-white/10",
                            Platform.isTV && viewModeFocus.focused && "border-white border-2",
                        )}
                    >
                        <Ionicons
                            name={
                                viewMode === "timeline"
                                    ? "time-outline"
                                    : viewMode === "list"
                                    ? "list-outline"
                                    : "grid-outline"
                            }
                            size={18}
                            color="rgba(255,255,255,0.8)"
                        />
                    </Pressable>

                    {/* Refresh schedule data */}
                    <Pressable
                        onPress={onRefresh}
                        hitSlop={10}
                        onFocus={refreshFocus.focus}
                        onBlur={refreshFocus.blur}
                        className={cn(
                            "rounded-lg p-1.5 active:bg-white/10",
                            Platform.isTV && refreshFocus.focused && "border-white border-2",
                        )}
                    >
                        <Ionicons name="refresh-outline" size={18} color="rgba(255,255,255,0.8)" />
                    </Pressable>

                    {/* Settings */}
                    <Pressable
                        onPress={onOpenSettings}
                        hitSlop={10}
                        onFocus={settingsFocus.focus}
                        onBlur={settingsFocus.blur}
                        className={cn(
                            "rounded-lg p-1.5 active:bg-white/10",
                            Platform.isTV && settingsFocus.focused && "border-white border-2",
                        )}
                    >
                        <Ionicons name="options-outline" size={18} color="rgba(255,255,255,0.8)" />
                    </Pressable>
                </View>
            </View>

            {/* Day Cards Row: Full-width edge-to-edge row on TV, horizontal scroll on phone */}
            {Platform.isTV ? (
                <View
                    className="flex-row items-center"
                    style={{
                        paddingHorizontal: TV.gutter,
                        gap: tvSize(10),
                        paddingVertical: 4,
                    }}
                >
                    {weekDays.map((item) => {
                        const count = getEventCount(item)
                        const isSelected = isSameDay(item, selectedDate)
                        const isDayToday = isSameDay(item, today)
                        return (
                            <View key={format(item, "yyyy-MM-dd")} style={{ flex: 1 }}>
                                <DayCard
                                    date={item}
                                    count={count}
                                    isSelected={isSelected}
                                    isToday={isDayToday}
                                    onPress={() => onSelectDate(item)}
                                    fullWidth
                                />
                            </View>
                        )
                    })}
                </View>
            ) : (
                <FlatList
                    horizontal
                    data={weekDays}
                    keyExtractor={(item) => format(item, "yyyy-MM-dd")}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: 14,
                        gap: 8,
                        paddingVertical: 4,
                    }}
                    renderItem={({ item }) => {
                        const count = getEventCount(item)
                        const isSelected = isSameDay(item, selectedDate)
                        const isDayToday = isSameDay(item, today)
                        return (
                            <DayCard
                                date={item}
                                count={count}
                                isSelected={isSelected}
                                isToday={isDayToday}
                                onPress={() => onSelectDate(item)}
                            />
                        )
                    }}
                />
            )}
        </View>
    )
}

function DayCard({
    date,
    count,
    isSelected,
    isToday,
    onPress,
    fullWidth,
}: {
    date: Date
    count: number
    isSelected: boolean
    isToday: boolean
    onPress: () => void
    fullWidth?: boolean
}) {
    const tvFocus = useTVFocus(1.05, `day-${format(date, "yyyy-MM-dd")}`)
    const dayIndex = date.getDay()
    const dayName = DAY_NAMES[dayIndex]
    const dateFormatted = format(date, "d MMM")

    const countLabel = count === 1 ? "1 episode" : `${count} episodes`

    return (
        <Pressable
            onPress={onPress}
            onFocus={tvFocus.focus}
            onBlur={tvFocus.blur}
            className="active:opacity-90"
            style={fullWidth ? { width: "100%" } : undefined}
        >
            <Animated.View
                style={[
                    Platform.isTV ? tvFocus.style : undefined,
                    {
                        width: fullWidth ? "100%" : undefined,
                        minWidth: fullWidth ? 0 : (Platform.isTV ? tvSize(140) : 108),
                        paddingVertical: Platform.isTV ? tvSize(10) : 8,
                        paddingHorizontal: Platform.isTV ? tvSize(12) : 12,
                        borderRadius: 14,
                        borderWidth: Platform.isTV ? tvSize(2) : 1,
                        borderColor: Platform.isTV && tvFocus.focused
                            ? "rgb(184, 176, 255)"
                            : isSelected
                            ? "#ffffff"
                            : "rgba(255, 255, 255, 0.10)",
                        backgroundColor: isSelected
                            ? "#ffffff"
                            : "rgba(255, 255, 255, 0.04)",
                    },
                ]}
            >
                {/* Day name & optional Today indicator */}
                <View className="flex-row items-center justify-between gap-1 mb-0.5">
                    <Text
                        className={cn(
                            "text-xs font-semibold",
                            isSelected ? "text-neutral-900" : "text-white/60",
                        )}
                        numberOfLines={1}
                    >
                        {dayName}
                    </Text>

                    {isToday && (
                        <View
                            className={cn(
                                "size-2 rounded-full",
                                isSelected ? "bg-brand-500" : "bg-brand-400",
                            )}
                        />
                    )}
                </View>

                {/* Date number e.g. "8 Nov" */}
                <Text
                    className={cn(
                        "text-base font-extrabold",
                        isSelected ? "text-neutral-950" : "text-white",
                    )}
                >
                    {dateFormatted}
                </Text>

                {/* Episode count */}
                <Text
                    className={cn(
                        "text-[10px] mt-1 font-medium",
                        isSelected ? "text-neutral-600 font-bold" : "text-white/40",
                    )}
                >
                    {countLabel}
                </Text>
            </Animated.View>
        </Pressable>
    )
}
