import type { Anime_ScheduleItem } from "@/api/generated/types"
import type { ScheduleSettings } from "@/atoms/schedule.atoms"
import { useServerStatus } from "@/atoms/server.atoms"
import { useTVFocus } from "@/components/tv/tv-focus"
import { tvSize } from "@/components/tv/tv-scale"
import { SeaImage } from "@/components/shared/sea-image"
import { Ionicons } from "@/lib/icons/Ionicons"
import { cn } from "@/lib/utils"
import { scoreColor } from "@/lib/media-metadata"
import { format } from "date-fns"
import { router } from "expo-router"
import * as React from "react"
import { Animated, Platform, Pressable, Text, View } from "react-native"

export type TimelineEvent = Anime_ScheduleItem & {
    isWatched?: boolean
    rating?: number
}

export function TimelineEpisodeCard({
    item,
    settings,
    cardWidth,
}: {
    item: TimelineEvent
    settings: ScheduleSettings
    cardWidth?: number
}) {
    const tvFocus = useTVFocus(1.04, `timeline-card-${item.mediaId}-${item.episodeNumber}`)
    const serverStatus = useServerStatus()
    const isWatchedAndDimmed = item.isWatched && settings.indicateWatchedEpisodes

    const localTime = React.useMemo(() => {
        if (item.dateTime) {
            try {
                return format(new Date(item.dateTime), "h:mm a")
            } catch {
                return item.time
            }
        }
        return item.time
    }, [item.dateTime, item.time])

    const episodeLabel = React.useMemo(() => {
        if (item.isMovie) return "Movie"
        const ep = `Episode ${item.episodeNumber}`
        if (item.isSeasonFinale) return `${ep} · Finale`
        return ep
    }, [item.isMovie, item.episodeNumber, item.isSeasonFinale])

    const handlePress = React.useCallback(() => {
        router.push(`/(app)/entry/anime/${item.mediaId}`)
    }, [item.mediaId])

    return (
        <Pressable
            onPress={handlePress}
            onFocus={tvFocus.focus}
            onBlur={tvFocus.blur}
            className="active:opacity-90"
            style={cardWidth ? { width: cardWidth } : undefined}
        >
            <Animated.View
                style={[
                    Platform.isTV ? tvFocus.style : undefined,
                    {
                        borderRadius: 16,
                        borderWidth: Platform.isTV ? tvSize(2) : 1,
                        borderColor: Platform.isTV && tvFocus.focused
                            ? "rgb(184, 176, 255)"
                            : "rgba(255, 255, 255, 0.08)",
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                        opacity: isWatchedAndDimmed ? 0.45 : 1,
                    },
                ]}
                className="flex-row items-center p-2.5 gap-3 overflow-hidden"
            >
                {/* Artwork image with air time badge */}
                <View
                    style={{
                        width: Platform.isTV ? tvSize(110) : 84,
                        height: Platform.isTV ? tvSize(70) : 56,
                        borderRadius: 12,
                        overflow: "hidden",
                        backgroundColor: "rgba(255, 255, 255, 0.06)",
                    }}
                >
                    <SeaImage
                        source={{ uri: item.image }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                    />

                    {/* Airing time overlay badge on thumbnail */}
                    <View className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5">
                        <Text className="text-[10px] font-bold text-white/90">
                            {localTime}
                        </Text>
                    </View>
                </View>

                {/* Details */}
                <View className="flex-1 justify-center">
                    <Text
                        className="text-sm font-bold text-white"
                        numberOfLines={1}
                    >
                        {item.title}
                    </Text>

                    <View className="flex-row items-center gap-2 mt-1">
                        {!!item.rating && (
                            <View
                                className="flex-row items-center rounded-md bg-white/[0.08]"
                                style={{
                                    paddingHorizontal: Platform.isTV ? tvSize(6) : 5,
                                    paddingVertical: Platform.isTV ? tvSize(2) : 1,
                                    gap: Platform.isTV ? tvSize(4) : 3,
                                }}
                            >
                                <Ionicons
                                    name="star"
                                    size={Platform.isTV ? tvSize(12) : 10}
                                    color={scoreColor(item.rating)}
                                />
                                <Text
                                    className="font-bold"
                                    style={{
                                        color: scoreColor(item.rating),
                                        fontSize: Platform.isTV ? tvSize(13) : 11,
                                    }}
                                >
                                    {(item.rating / 10).toFixed(1)}
                                </Text>
                            </View>
                        )}

                        <Text
                            className="font-medium text-white/50"
                            style={{ fontSize: Platform.isTV ? tvSize(13) : 12 }}
                        >
                            {episodeLabel}
                        </Text>

                        {isWatchedAndDimmed && (
                            <View className="flex-row items-center gap-0.5 rounded-full bg-white/10 px-1.5 py-0.2">
                                <Ionicons name="checkmark" size={10} color="rgba(255,255,255,0.7)" />
                                <Text className="text-[10px] font-medium text-white/60">Watched</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Action: "Watch" button */}
                <View className="flex-row items-center gap-2 pl-1">
                    <View
                        className={cn(
                            "flex-row items-center gap-1 rounded-full px-3 py-1.5",
                            Platform.isTV && tvFocus.focused
                                ? "bg-white"
                                : "bg-white/15 active:bg-white",
                        )}
                    >
                        <Ionicons
                            name="play"
                            size={11}
                            color={Platform.isTV && tvFocus.focused ? "#000" : "#fff"}
                        />
                        <Text
                            className={cn(
                                "text-xs font-bold",
                                Platform.isTV && tvFocus.focused ? "text-black" : "text-white",
                            )}
                        >
                            Watch
                        </Text>
                    </View>
                </View>
            </Animated.View>
        </Pressable>
    )
}
