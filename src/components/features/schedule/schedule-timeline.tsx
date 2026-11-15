import type { ScheduleSettings } from "@/atoms/schedule.atoms"
import { TV, tvSize } from "@/components/tv/tv-scale"
import { Ionicons } from "@/lib/icons/Ionicons"
import { format } from "date-fns"
import { hourLabelFormatFor } from "@/lib/schedule-settings"
import sortBy from "lodash/sortBy"
import * as React from "react"
import {
    FlatList,
    Platform,
    RefreshControl,
    Text,
    useWindowDimensions,
    View,
} from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"
import { TimelineEpisodeCard, type TimelineEvent } from "./timeline-episode-card"

export type HourTimelineBlock = {
    hour: number
    hourLabel: string
    episodes: TimelineEvent[]
}

export function ScheduleTimeline({
    events,
    settings,
    header,
    footer,
    refreshControl,
    emptyLabel,
}: {
    events: TimelineEvent[]
    settings: ScheduleSettings
    header: React.ReactElement
    footer: React.ReactElement | null
    refreshControl: React.ReactElement<React.ComponentProps<typeof RefreshControl>> | undefined
    emptyLabel: string
}) {
    const { width } = useWindowDimensions()

    // Group events by local hour (0..23)
    const hourBlocks = React.useMemo<HourTimelineBlock[]>(() => {
        if (!events || events.length === 0) return []

        const map = new Map<number, TimelineEvent[]>()

        for (const ev of events) {
            let hour = 0
            if (ev.dateTime) {
                try {
                    hour = new Date(ev.dateTime).getHours()
                } catch {
                    hour = 0
                }
            }
            const list = map.get(hour) ?? []
            list.push(ev)
            map.set(hour, list)
        }

        const sortedHours = Array.from(map.keys()).sort((a, b) => a - b)

        return sortedHours.map((hour) => {
            const date = new Date()
            date.setHours(hour, 0, 0, 0)
            const hourLabel = format(date, hourLabelFormatFor(settings.clock))
            const episodes = sortBy(map.get(hour) ?? [], [(e) => e.dateTime, (e) => e.episodeNumber])
            return {
                hour,
                hourLabel,
                episodes,
            }
        })
    }, [events, settings.clock])

    const gap = Platform.isTV ? tvSize(14) : 10
    const paddingHorizontal = Platform.isTV ? TV.gutter : 14

    // Card width for 2-column layout on wider screens or TV (minus timeline axis 34px and gap)
    const cardWidth = React.useMemo(() => {
        if (Platform.isTV || width >= 720) {
            const available = width - paddingHorizontal * 2 - 34 - gap
            return Math.floor(available / 2)
        }
        return undefined // 100% width on phone
    }, [width, paddingHorizontal, gap])

    return (
        <Animated.View entering={FadeIn.duration(200)} className="flex-1">
            <FlatList
                data={hourBlocks}
                keyExtractor={(item) => `hour-block-${item.hour}`}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={header}
                ListFooterComponent={footer ?? undefined}
                ListEmptyComponent={
                    <View className="items-center justify-center px-8 py-16">
                        <Ionicons name="calendar-outline" size={44} color="rgba(255,255,255,0.18)" />
                        <Text className="text-white/40 text-sm mt-3 text-center">
                            {emptyLabel}
                        </Text>
                    </View>
                }
                refreshControl={refreshControl}
                contentContainerStyle={{
                    paddingTop: Platform.isTV ? TV.navInset + tvSize(12) : 8,
                    paddingBottom: 80,
                    paddingHorizontal,
                }}
                renderItem={({ item: block, index }) => (
                    <HourSection
                        block={block}
                        settings={settings}
                        cardWidth={cardWidth}
                        gap={gap}
                        isLast={index === hourBlocks.length - 1}
                    />
                )}
            />
        </Animated.View>
    )
}

function HourSection({
    block,
    settings,
    cardWidth,
    gap,
    isLast,
}: {
    block: HourTimelineBlock
    settings: ScheduleSettings
    cardWidth?: number
    gap: number
    isLast: boolean
}) {
    return (
        <View className="flex-row">
            {/* Left timeline axis */}
            <View className="items-center mr-3" style={{ width: 22 }}>
                {/* Node dot */}
                <View className="size-3 rounded-full bg-brand-400 border-2 border-background z-10 my-1" />
                {/* Vertical connecting line */}
                {!isLast && (
                    <View className="flex-1 w-[2px] bg-white/10" />
                )}
            </View>

            {/* Right content */}
            <View className="flex-1 pb-6">
                {/* Hour title + count badge */}
                <View className="flex-row items-center gap-2 mb-2.5">
                    <Text className="text-sm font-extrabold text-white">
                        {block.hourLabel}
                    </Text>
                    <View className="rounded-full bg-white/10 px-2 py-0.5">
                        <Text className="text-[11px] font-semibold text-white/60">
                            {block.episodes.length}
                        </Text>
                    </View>
                </View>

                {/* Episode cards */}
                <View
                    className={cardWidth ? "flex-row flex-wrap" : undefined}
                    style={{ gap }}
                >
                    {block.episodes.map((item) => (
                        <TimelineEpisodeCard
                            key={`${item.mediaId}-${item.episodeNumber}-${item.dateTime}`}
                            item={item}
                            settings={settings}
                            cardWidth={cardWidth}
                        />
                    ))}
                </View>
            </View>
        </View>
    )
}

export function ScheduleFlatList({
    events,
    settings,
    header,
    footer,
    refreshControl,
    emptyLabel,
}: {
    events: TimelineEvent[]
    settings: ScheduleSettings
    header: React.ReactElement
    footer: React.ReactElement | null
    refreshControl: React.ReactElement<React.ComponentProps<typeof RefreshControl>> | undefined
    emptyLabel: string
}) {
    const { width } = useWindowDimensions()

    const gap = Platform.isTV ? tvSize(14) : 10
    const paddingHorizontal = Platform.isTV ? TV.gutter : 14

    // 2-column layout on TV or wide screens
    const numColumns = Platform.isTV || width >= 720 ? 2 : 1
    const cardWidth = React.useMemo(() => {
        if (numColumns === 2) {
            const available = width - paddingHorizontal * 2 - gap
            return Math.floor(available / 2)
        }
        return undefined
    }, [numColumns, width, paddingHorizontal, gap])

    return (
        <Animated.View entering={FadeIn.duration(200)} className="flex-1">
            <FlatList
                key={`schedule-flat-list-${numColumns}`}
                data={events}
                numColumns={numColumns}
                keyExtractor={(item) => `${item.mediaId}-${item.episodeNumber}-${item.dateTime}`}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={header}
                ListFooterComponent={footer ?? undefined}
                ListEmptyComponent={
                    <View className="items-center justify-center px-8 py-16">
                        <Ionicons name="calendar-outline" size={44} color="rgba(255,255,255,0.18)" />
                        <Text className="text-white/40 text-sm mt-3 text-center">
                            {emptyLabel}
                        </Text>
                    </View>
                }
                refreshControl={refreshControl}
                contentContainerStyle={{
                    paddingTop: Platform.isTV ? TV.navInset + tvSize(12) : 8,
                    paddingBottom: 80,
                    paddingHorizontal,
                    gap,
                }}
                columnWrapperStyle={numColumns > 1 ? { gap } : undefined}
                renderItem={({ item }) => (
                    <TimelineEpisodeCard
                        item={item}
                        settings={settings}
                        cardWidth={cardWidth}
                    />
                )}
            />
        </Animated.View>
    )
}

