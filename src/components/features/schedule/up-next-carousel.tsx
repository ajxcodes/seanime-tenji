import type { AL_BaseAnime, Anime_EpisodeMetadata, Anime_UpcomingEpisode } from "@/api/generated/types"
import { useServerStatus } from "@/atoms/server.atoms"
import { scheduleSettingsAtom } from "@/atoms/schedule.atoms"
import { useAtom } from "jotai/react"
import { useTVFocus } from "@/components/tv/tv-focus"
import { TV, tvSize } from "@/components/tv/tv-scale"
import { SeaImage } from "@/components/shared/sea-image"
import { getEpisodeSpoilerState, getSpoilerSafeAnimeImage } from "@/lib/anime-spoilers"
import { timeFormatFor } from "@/lib/schedule-settings"
import { Ionicons } from "@/lib/icons/Ionicons"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { scoreColor } from "@/lib/media-metadata"
import { router } from "expo-router"
import * as React from "react"
import { Animated, FlatList, Platform, Pressable, Text, useWindowDimensions, View } from "react-native"

export type UpNextItem = {
    id: string | number
    mediaId: number
    title: string
    episodeNumber: number
    airingAt: number // unix timestamp in seconds
    rating?: number
    image?: string
    bannerImage?: string
    isMovie?: boolean
    media?: AL_BaseAnime
    episodeMetadata?: Anime_EpisodeMetadata
}

export function useCountdown(airingAt: number) {
    const [timeLeft, setTimeLeft] = React.useState(() => computeTimeLeft(airingAt))

    React.useEffect(() => {
        const update = () => {
            setTimeLeft(computeTimeLeft(airingAt))
        }
        update()
        const timer = setInterval(update, 1000)
        return () => clearInterval(timer)
    }, [airingAt])

    return timeLeft
}

function computeTimeLeft(airingAt: number) {
    const now = Math.floor(Date.now() / 1000)
    const diff = Math.max(0, airingAt - now)
    if (diff <= 0) return "Airing now"

    const hours = Math.floor(diff / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    const seconds = diff % 60

    if (hours >= 24) {
        const days = Math.floor(hours / 24)
        const remHours = hours % 24
        return `${days}d ${String(remHours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`
    }

    return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`
}

export function UpNextCarousel({ items }: { items: UpNextItem[] }) {
    const { width } = useWindowDimensions()

    const cardWidth = React.useMemo(() => {
        if (Platform.isTV) {
            const gap = tvSize(14)
            const available = width - TV.gutter * 2 - gap * 2
            return Math.floor(available / 3)
        }
        return Math.min(340, Math.max(260, Math.floor(width * 0.78)))
    }, [width])

    if (!items || items.length === 0) return null

    return (
        <View className="pt-2 pb-4">
            <FlatList
                horizontal
                data={items}
                keyExtractor={(item) => String(item.id)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: Platform.isTV ? TV.gutter : 16,
                    gap: Platform.isTV ? tvSize(14) : 12,
                }}
                renderItem={({ item, index }) => (
                    <UpNextCard item={item} cardWidth={cardWidth} isFirst={index === 0} />
                )}
            />
        </View>
    )
}

function UpNextCard({ item, cardWidth, isFirst }: { item: UpNextItem; cardWidth: number; isFirst: boolean }) {
    const tvFocus = useTVFocus(1.04, `up-next-${item.id}`)
    const countdown = useCountdown(item.airingAt)
    const serverStatus = useServerStatus()
    const [settings] = useAtom(scheduleSettingsAtom)
    const blurAdultContent = !!serverStatus?.settings?.anilist?.blurAdultContent && !!item.media?.isAdult

    const airDate = new Date(item.airingAt * 1000)
    const airTimeLabel = isFirst
        ? `Up next · ${format(airDate, timeFormatFor(settings.clock))}`
        : format(airDate, `EEE · ${timeFormatFor(settings.clock)}`)

    const spoiler = getEpisodeSpoilerState(serverStatus, {
        episodeNumber: item.episodeNumber,
        watchedProgress: 0,
    })

    const displayImage = item.bannerImage
        || (spoiler.hideThumbnail && item.media ? getSpoilerSafeAnimeImage(item.media) : (item.image || item.media?.bannerImage || item.media?.coverImage?.large))

    return (
        <Pressable
            onPress={() => router.push(`/(app)/entry/anime/${item.mediaId}`)}
            onFocus={tvFocus.focus}
            onBlur={tvFocus.blur}
            style={{ width: cardWidth }}
            className="active:opacity-90"
        >
            <Animated.View
                style={[
                    Platform.isTV ? tvFocus.style : undefined,
                    {
                        width: cardWidth,
                        height: Platform.isTV ? tvSize(110) : 100,
                        borderRadius: 16,
                        overflow: "hidden",
                        borderWidth: Platform.isTV ? tvSize(2) : 1,
                        borderColor: Platform.isTV && tvFocus.focused
                            ? "rgb(184, 176, 255)"
                            : "rgba(255, 255, 255, 0.12)",
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                    },
                ]}
            >
                {/* Background image & gradient overlay */}
                {displayImage ? (
                    <SeaImage
                        source={{ uri: displayImage }}
                        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                        contentFit="cover"
                        blurRadius={blurAdultContent ? 14 : 0}
                    />
                ) : null}

                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(10, 10, 10, 0.72)",
                    }}
                />

                {/* Content */}
                <View className="flex-1 justify-between p-3">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-1.5 rounded-md bg-black/60 px-2 py-0.5 border border-white/10">
                            <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.7)" />
                            <Text className="text-[11px] font-semibold text-white/90">
                                {airTimeLabel}
                            </Text>
                        </View>

                        <Ionicons name="arrow-forward-circle-outline" size={16} color="rgba(255,255,255,0.5)" />
                    </View>

                    <View>
                        <Text className="text-xs font-bold text-white" numberOfLines={1}>
                            {item.title}
                        </Text>
                        <View className="flex-row items-center justify-between mt-1">
                            <View className="flex-row items-center gap-1.5">
                                {!!item.rating && (
                                    <View className="flex-row items-center gap-0.5 rounded bg-black/60 px-1 py-0.5">
                                        <Ionicons name="star" size={9} color={scoreColor(item.rating)} />
                                        <Text
                                            className="text-[10px] font-bold"
                                            style={{ color: scoreColor(item.rating) }}
                                        >
                                            {(item.rating / 10).toFixed(1)}
                                        </Text>
                                    </View>
                                )}
                                <Text className="text-[11px] font-medium text-white/60">
                                    {item.isMovie ? "Movie" : `Episode ${item.episodeNumber}`}
                                </Text>
                            </View>
                            <View className="flex-row items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 border border-brand-500/30">
                                <Text className="font-mono text-[11px] font-bold text-brand-300">
                                    {countdown}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Animated.View>
        </Pressable>
    )
}
