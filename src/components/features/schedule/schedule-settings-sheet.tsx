import { AL_MediaListStatus } from "@/api/generated/types"
import { ScheduleSettings } from "@/atoms/schedule.atoms"
import { LabeledSwitch } from "@/components/shared/labeled-switch"
import { RowDivider } from "@/components/shared/row-divider"
import { Surface } from "@/components/shared/surface"
import { SeaBottomSheet } from "@/components/ui/bottom-sheet"
import { cn } from "@/lib/utils"
import {
    COUNTRY_OPTIONS,
    FORMAT_OPTIONS,
    type Clock,
} from "@/lib/schedule-settings"
import Ionicons from "@expo/vector-icons/Ionicons"
import * as React from "react"
import { Platform, Pressable, Text, View } from "react-native"

const STATUS_OPTIONS: { label: string; value: AL_MediaListStatus }[] = [
    { label: "Watching", value: "CURRENT" },
    { label: "Planning", value: "PLANNING" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Paused", value: "PAUSED" },
    { label: "Repeating", value: "REPEATING" },
]

const ADULT_OPTIONS: { label: string; value: ScheduleSettings["adult"] }[] = [
    { label: "Hide", value: "hide" },
    { label: "Show", value: "show" },
    { label: "Only", value: "only" },
]

const CLOCK_OPTIONS: { label: string; value: Clock }[] = [
    { label: "Auto", value: "auto" },
    { label: "12h", value: "12h" },
    { label: "24h", value: "24h" },
]

/**
 * Schedule settings sheet.
 * Scope (All / My List) and display layout (Timeline / Flat list / Grid) stay in the
 * WeekDayStrip header as quick toggles — everything else lives here.
 */
export function ScheduleSettingsSheet({
    open,
    onOpenChange,
    settings,
    onSettingsChange,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    settings: ScheduleSettings
    onSettingsChange: (update: ScheduleSettings | ((prev: ScheduleSettings) => ScheduleSettings)) => void
}) {
    function toggleStatus(status: AL_MediaListStatus) {
        onSettingsChange((prev) => {
            const current = prev.listStatuses
            const next = current.includes(status)
                ? current.filter((s) => s !== status)
                : [...current, status]
            return { ...prev, listStatuses: next }
        })
    }

    function toggleFormat(format: string) {
        onSettingsChange((prev) => {
            const current = prev.formats
            const next = current.includes(format)
                ? current.filter((f) => f !== format)
                : [...current, format]
            return { ...prev, formats: next }
        })
    }

    function toggleCountry(group: string) {
        onSettingsChange((prev) => {
            const current = prev.countries
            const next = current.includes(group)
                ? current.filter((c) => c !== group)
                : [...current, group]
            return { ...prev, countries: next }
        })
    }

    function toggleIndicateWatched() {
        onSettingsChange((prev) => ({
            ...prev,
            indicateWatchedEpisodes: !prev.indicateWatchedEpisodes,
        }))
    }

    function toggleMissingEpisodes() {
        onSettingsChange((prev) => ({
            ...prev,
            hideMissingEpisodes: !(prev.hideMissingEpisodes ?? false),
        }))
    }

    function toggleUpcomingEpisodes() {
        onSettingsChange((prev) => ({
            ...prev,
            hideUpcomingEpisodes: !(prev.hideUpcomingEpisodes ?? false),
        }))
    }

    return (
        <SeaBottomSheet open={open} onOpenChange={onOpenChange} snapPoints={["88%"]}>
            <View className="gap-5 px-1 pb-2">
                <View className="items-center">
                    <Text className="text-lg font-bold text-white">Schedule settings</Text>
                    <Text className="text-xs text-white/40 mt-0.5">
                        Scope and layout are toggled from the header
                    </Text>
                </View>

                {settings.scope === "my_list" && (
                    <View className="gap-2">
                        <Text className="text-sm font-medium text-white/50">Filter by status</Text>
                        <Surface variant="muted" className="overflow-hidden">
                            {STATUS_OPTIONS.map((opt, i) => {
                                const active = settings.listStatuses.includes(opt.value)
                                return (
                                    <React.Fragment key={opt.value}>
                                        {i > 0 && <RowDivider />}
                                        <Pressable
                                            onPress={() => toggleStatus(opt.value)}
                                            className="flex-row items-center justify-between px-4 py-3"
                                        >
                                            <Text className={cn("text-sm", active ? "text-white" : "text-white/50")}>
                                                {opt.label}
                                            </Text>
                                            {active && <Ionicons name="checkmark" size={18} color="rgb(97,82,223)" />}
                                        </Pressable>
                                    </React.Fragment>
                                )
                            })}
                        </Surface>
                    </View>
                )}

                {/* Formats */}
                <View className="gap-2">
                    <Text className="text-sm font-medium text-white/50">Formats</Text>
                    <Text className="text-[11px] text-white/30">Regular TV anime is always shown</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {FORMAT_OPTIONS.map((opt) => (
                            <TogglePill
                                key={opt.value}
                                label={opt.label}
                                active={settings.formats.includes(opt.value)}
                                onPress={() => toggleFormat(opt.value)}
                            />
                        ))}
                    </View>
                </View>

                {/* Countries */}
                <View className="gap-2">
                    <Text className="text-sm font-medium text-white/50">Countries</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {COUNTRY_OPTIONS.map((opt) => (
                            <TogglePill
                                key={opt.value}
                                label={opt.label}
                                active={settings.countries.includes(opt.value)}
                                onPress={() => toggleCountry(opt.value)}
                            />
                        ))}
                    </View>
                </View>

                {/* Adult titles */}
                <View className="gap-2">
                    <Text className="text-sm font-medium text-white/50">Adult titles</Text>
                    <SegmentedControl
                        options={ADULT_OPTIONS}
                        value={settings.adult}
                        onChange={(adult) => onSettingsChange((prev) => ({ ...prev, adult }))}
                    />
                </View>

                {/* Clock */}
                <View className="gap-2">
                    <Text className="text-sm font-medium text-white/50">Clock</Text>
                    <SegmentedControl
                        options={CLOCK_OPTIONS}
                        value={settings.clock}
                        onChange={(clock) => onSettingsChange((prev) => ({ ...prev, clock }))}
                    />
                </View>

                <View className="gap-3 px-1">
                    <LabeledSwitch
                        label="Indicate watched episodes"
                        helper="Dim episodes you've already watched"
                        checked={settings.indicateWatchedEpisodes}
                        onToggle={toggleIndicateWatched}
                    />
                    <LabeledSwitch
                        label="Hide missing episodes"
                        checked={settings.hideMissingEpisodes ?? false}
                        onToggle={toggleMissingEpisodes}
                    />
                    <LabeledSwitch
                        label="Hide upcoming episodes"
                        checked={settings.hideUpcomingEpisodes ?? false}
                        onToggle={toggleUpcomingEpisodes}
                    />
                </View>
            </View>
        </SeaBottomSheet>
    )
}

function TogglePill({
    label,
    active,
    onPress,
}: {
    label: string
    active: boolean
    onPress: () => void
}) {
    return (
        <Pressable
            onPress={onPress}
            className={cn(
                "flex-row items-center gap-1.5 rounded-full border px-3.5 py-2",
                active
                    ? "bg-brand-500/20 border-brand-500"
                    : "bg-white/[0.04] border-white/10",
            )}
        >
            {active && <Ionicons name="checkmark" size={12} color="rgb(184, 176, 255)" />}
            <Text
                className={cn(
                    "text-xs font-semibold",
                    active ? "text-white" : "text-white/50",
                )}
            >
                {label}
            </Text>
        </Pressable>
    )
}

function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { label: string; value: T }[]
    value: T
    onChange: (value: T) => void
}) {
    return (
        <View className="flex-row gap-2">
            {options.map((opt) => {
                const active = value === opt.value
                return (
                    <Pressable
                        key={opt.value}
                        onPress={() => onChange(opt.value)}
                        className={cn(
                            "flex-1 items-center justify-center rounded-xl border py-3",
                            active
                                ? "bg-brand-500/20 border-brand-500"
                                : "bg-white/[0.04] border-white/10",
                        )}
                    >
                        <Text
                            className={cn(
                                "text-xs font-semibold",
                                active ? "text-white" : "text-white/50",
                            )}
                        >
                            {opt.label}
                        </Text>
                    </Pressable>
                )
            })}
        </View>
    )
}
