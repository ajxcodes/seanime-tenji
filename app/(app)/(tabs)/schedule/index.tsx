import { AL_BaseAnime, Anime_ScheduleItem } from "@/api/generated/types"
import { useGetAnimeScheduleWeekly } from "@/api/hooks/anime_collection.hooks"
import { useGetMissingEpisodes, useGetUpcomingEpisodes } from "@/api/hooks/anime_entries.hooks"
import { useAnilistAnimeCollectionAtom, useAnilistAnimeEntryListDataAtom } from "@/atoms/anilist-collection.atoms"
import { ScheduleSettings, scheduleSettingsAtom, normalizeScheduleSettings } from "@/atoms/schedule.atoms"
import { useServerStatus } from "@/atoms/server.atoms"
import { EpisodeCard } from "@/components/features/anime/episode-card"
import { MediaEntryCard } from "@/components/features/media/media-entry-card"
import { ScheduleSettingsSheet } from "@/components/features/schedule/schedule-settings-sheet"
import { ScheduleFlatList, ScheduleTimeline } from "@/components/features/schedule/schedule-timeline"
import { UpNextCarousel, type UpNextItem } from "@/components/features/schedule/up-next-carousel"
import { WeekDayStrip } from "@/components/features/schedule/week-day-strip"
import { TV, tvSize } from "@/components/tv/tv-scale"
import { SafeView } from "@/components/layout/layout-view"
import { TabFadeView } from "@/components/layout/tab-fade-view"
import { OfflineBanner } from "@/components/shared/offline-banner"
import { isAdultVisible, isCountryVisible, isFormatVisible, timeFormatFor } from "@/lib/schedule-settings"
import { SeaBottomSheet } from "@/components/ui/bottom-sheet"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import { getEpisodeSpoilerState, getSpoilerSafeAnimeImage } from "@/lib/anime-spoilers"
import { useIsServerConnected } from "@/lib/offline"
import { getHorizontalCardRenderCount, getMediaGridLayout } from "@/lib/responsive-card-layout"
import { getShelfBadge, getShelfTitle, type ShelfEpisode } from "@/lib/schedule-episodes"
import { cn } from "@/lib/utils"
import Ionicons from "@expo/vector-icons/Ionicons"
import { addDays, addWeeks, format, isSameDay, setMonth, setYear, startOfWeek, subWeeks } from "date-fns"
import { router } from "expo-router"
import { useAtom } from "jotai/react"
import sortBy from "lodash/sortBy"
import * as React from "react"
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, Text, useWindowDimensions, View } from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const GRID_SPACING = 10
const GRID_PADDING = 14
const SHELF_SPACING = 12
const SHELF_PADDING = 16

export type ScheduleEvent = Anime_ScheduleItem & {
    isWatched: boolean
    rating?: number
}

export default function ScheduleScreen() {
    const isConnected = useIsServerConnected()
    const {
        data: missingEpisodes,
        isFetching: missingFetching,
        refetch: refetchMissing,
    } = useGetMissingEpisodes(isConnected)
    const {
        data: upcomingEpisodes,
        isFetching: upcomingFetching,
        refetch: refetchUpcoming,
    } = useGetUpcomingEpisodes(isConnected)

    useIOSScrollRefreshRateWorkaround()

    const [storedSettings, setStoredSettings] = useAtom(scheduleSettingsAtom)
    const settings = React.useMemo(() => normalizeScheduleSettings(storedSettings), [storedSettings])
    const setSettings = React.useCallback(
        (update: ScheduleSettings | ((prev: ScheduleSettings) => ScheduleSettings)) => {
            setStoredSettings(prevStored => {
                const base = normalizeScheduleSettings(prevStored)
                return typeof update === "function" ? update(base) : update
            })
        },
        [setStoredSettings],
    )
    const { animeCollection } = useAnilistAnimeCollectionAtom()
    const { animeEntryListData } = useAnilistAnimeEntryListDataAtom()

    const [settingsOpen, setSettingsOpen] = React.useState(false)
    const [monthPickerOpen, setMonthPickerOpen] = React.useState(false)

    // week navigation
    const [currentWeekStart, setCurrentWeekStart] = React.useState(() =>
        startOfWeek(new Date(), { weekStartsOn: 1 }),
    )
    const [selectedDate, setSelectedDate] = React.useState(() => new Date())

    const weekDays = React.useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
    }, [currentWeekStart])

    const weekStartSec = React.useMemo(() => {
        return Math.floor(currentWeekStart.getTime() / 1000)
    }, [currentWeekStart])

    // Fetch the whole week from the server's weekly endpoint
    const {
        data: weeklyResponse,
        isLoading,
        isFetching,
        refetch,
    } = useGetAnimeScheduleWeekly({
        weekStart: weekStartSec,
        scope: settings.scope,
        adult: settings.adult,
        enabled: isConnected,
    })
    const weeklyItems = React.useMemo(() => weeklyResponse?.items ?? [], [weeklyResponse?.items])

    // Week bounds: allow ±26 weeks either way (server endpoint has no bounds)
    const { minWeekStart, maxWeekStart } = React.useMemo(() => {
        const now = new Date()
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        return {
            minWeekStart: subWeeks(weekStart, 26),
            maxWeekStart: addWeeks(weekStart, 26),
        }
    }, [])

    const canGoPrevWeek = currentWeekStart.getTime() > minWeekStart.getTime()
    const canGoNextWeek = currentWeekStart.getTime() < maxWeekStart.getTime()

    // Map AniList meanScore for collection entries
    const collectionScoreMap = React.useMemo(() => {
        const map = new Map<number, number>()
        if (animeCollection?.MediaListCollection?.lists) {
            for (const list of animeCollection.MediaListCollection.lists) {
                for (const entry of list.entries ?? []) {
                    if (entry.media?.id && entry.media.meanScore) {
                        map.set(entry.media.id, entry.media.meanScore)
                    }
                }
            }
        }
        return map
    }, [animeCollection])

    // Events: Combine server weekly schedule with user progress
    const eventsByDate = React.useMemo(() => {
        const map = new Map<string, ScheduleEvent[]>()

        for (const item of weeklyItems) {
            if (!item.dateTime) continue

            // Format / country visibility filters
            if (!isFormatVisible(item.format, settings.formats)) continue
            if (!isCountryVisible(item.countryOfOrigin, settings.countries)) continue

            // Filter by user's list statuses (only items in their list)
            const entryData = animeEntryListData?.[String(item.mediaId)]
            if (entryData?.status && !settings.listStatuses.includes(entryData.status)) {
                continue
            }

            const localDate = format(new Date(item.dateTime), "yyyy-MM-dd")
            const existing = map.get(localDate) ?? []

            const isWatched = entryData?.progress
                ? entryData.progress >= item.episodeNumber
                : false
            const rating = collectionScoreMap.get(item.mediaId) ?? (item as any).rating

            existing.push({ ...item, isWatched, rating })
            map.set(localDate, existing)
        }

        for (const [key, items] of map) {
            map.set(key, sortBy(items, [(i) => i.dateTime, (i) => i.episodeNumber]))
        }
        return map
    }, [weeklyItems, settings.listStatuses, settings.formats, settings.countries, animeEntryListData, collectionScoreMap])

    // Up Next countdown banner items
    const upNextItems = React.useMemo<UpNextItem[]>(() => {
        const nowSec = Math.floor(Date.now() / 1000)
        const items: UpNextItem[] = []

        // From upcomingEpisodes (collection-wide across all time)
        if (upcomingEpisodes?.episodes) {
            for (const ep of upcomingEpisodes.episodes) {
                if (!(ep.airingAt && ep.airingAt > nowSec && ep.baseAnime)) continue
                if (!isFormatVisible(ep.baseAnime.format, settings.formats)) continue
                if (!isCountryVisible(ep.baseAnime.countryOfOrigin, settings.countries)) continue
                if (!isAdultVisible(ep.baseAnime.isAdult, settings.adult)) continue
                items.push({
                        id: `upcoming-${ep.baseAnime.id}-${ep.episodeNumber}`,
                        mediaId: ep.baseAnime.id,
                        title: ep.baseAnime.title?.userPreferred || ep.baseAnime.title?.english || ep.baseAnime.title?.romaji || "",
                        episodeNumber: ep.episodeNumber,
                        airingAt: ep.airingAt,
                        rating: ep.baseAnime.meanScore,
                        image: ep.episodeMetadata?.image || ep.baseAnime.coverImage?.large,
                        bannerImage: ep.baseAnime.bannerImage,
                        media: ep.baseAnime,
                        episodeMetadata: ep.episodeMetadata,
                    })
            }
        }

        // From weekly endpoint items in the future
        for (const item of weeklyItems) {
            if (!item.dateTime) continue
            if (!isFormatVisible(item.format, settings.formats)) continue
            if (!isCountryVisible(item.countryOfOrigin, settings.countries)) continue
            const tSec = Math.floor(new Date(item.dateTime).getTime() / 1000)
            if (
                tSec > nowSec &&
                !items.some((i) => i.mediaId === item.mediaId && i.episodeNumber === item.episodeNumber)
            ) {
                items.push({
                    id: `weekly-${item.mediaId}-${item.episodeNumber}-${item.dateTime}`,
                    mediaId: item.mediaId,
                    title: item.title,
                    episodeNumber: item.episodeNumber,
                    airingAt: tSec,
                    rating: collectionScoreMap.get(item.mediaId) ?? (item as any).rating,
                    image: item.image,
                    isMovie: item.isMovie,
                })
            }
        }

        return sortBy(items, [(i) => i.airingAt]).slice(0, 10)
    }, [upcomingEpisodes, weeklyItems, collectionScoreMap, settings.formats, settings.countries, settings.adult])

    const selectedDateKey = format(selectedDate, "yyyy-MM-dd")
    const selectedDayEvents = eventsByDate.get(selectedDateKey) ?? []
    const missing = settings.hideMissingEpisodes
        ? []
        : missingEpisodes?.episodes?.filter((episode) => !!episode.baseAnime) ?? []
    const upcoming = settings.hideUpcomingEpisodes
        ? []
        : upcomingEpisodes?.episodes?.filter((episode) => !!episode.baseAnime) ?? []

    function goToPreviousWeek() {
        if (!canGoPrevWeek) return
        const newWeekStart = subWeeks(currentWeekStart, 1)
        setCurrentWeekStart(newWeekStart)
        const dayDiff = Math.round((selectedDate.getTime() - currentWeekStart.getTime()) / 86400000)
        setSelectedDate(addDays(newWeekStart, Math.max(0, Math.min(6, dayDiff))))
    }

    function goToNextWeek() {
        if (!canGoNextWeek) return
        const newWeekStart = addWeeks(currentWeekStart, 1)
        setCurrentWeekStart(newWeekStart)
        const dayDiff = Math.round((selectedDate.getTime() - currentWeekStart.getTime()) / 86400000)
        setSelectedDate(addDays(newWeekStart, Math.max(0, Math.min(6, dayDiff))))
    }

    function getEventCount(date: Date): number {
        const key = format(date, "yyyy-MM-dd")
        return eventsByDate.get(key)?.length ?? 0
    }

    function jumpToMonth(year: number, month: number) {
        const target = setYear(setMonth(new Date(), month), year)
        const weekStart = startOfWeek(target, { weekStartsOn: 1 })
        setCurrentWeekStart(weekStart)
        setSelectedDate(target)
        setMonthPickerOpen(false)
    }

    function goToToday() {
        const today = new Date()
        setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 1 }))
        setSelectedDate(today)
    }

    function toggleViewMode() {
        setSettings((prev) => ({
            ...prev,
            viewMode:
                prev.viewMode === "timeline"
                    ? "list"
                    : prev.viewMode === "list"
                    ? "grid"
                    : "timeline",
        }))
    }

    function toggleScope() {
        setSettings((prev) => ({
            ...prev,
            scope: prev.scope === "all" ? "my_list" : "all",
        }))
    }

    const isPageLoading = isLoading
    const isPageFetching = isFetching || missingFetching || upcomingFetching

    const handleRefresh = React.useCallback(() => {
        void Promise.all([refetch(), refetchMissing(), refetchUpcoming()])
    }, [refetch, refetchMissing, refetchUpcoming])

    const refreshControl = isConnected ? (
        <RefreshControl
            refreshing={isPageFetching && !isPageLoading}
            onRefresh={handleRefresh}
            tintColor="rgba(255,255,255,0.45)"
        />
    ) : undefined

    const listHeader = (
        <>
            {/* 1. "Up Next" Countdown Carousel */}
            {upNextItems.length > 0 && <UpNextCarousel items={upNextItems} />}

            {/* 2. Week navigation + Day selector strip */}
            <WeekDayStrip
                weekDays={weekDays}
                selectedDate={selectedDate}
                currentWeekStart={currentWeekStart}
                canGoPrevWeek={canGoPrevWeek}
                canGoNextWeek={canGoNextWeek}
                viewMode={settings.viewMode}
                scope={settings.scope}
                onSelectDate={setSelectedDate}
                onPrevWeek={goToPreviousWeek}
                onNextWeek={goToNextWeek}
                onToday={goToToday}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenMonthPicker={() => setMonthPickerOpen(true)}
                onToggleViewMode={toggleViewMode}
                onToggleScope={toggleScope}
                onRefresh={handleRefresh}
                getEventCount={getEventCount}
            />
        </>
    )

    const listFooter = missing.length > 0 || upcoming.length > 0 ? (
        <View className="gap-5 pt-6 pb-8">
            <ScheduleEpisodeShelf title="Missing Episodes" episodes={missing} />
            <ScheduleEpisodeShelf title="Upcoming Episodes" episodes={upcoming} />
        </View>
    ) : null

    return (
        <TabFadeView>
            <SafeView>
                <OfflineBanner />

                {!isConnected ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <Ionicons name="cloud-offline-outline" size={40} color="rgba(255,255,255,0.2)" />
                        <Text className="text-white/30 text-sm mt-3 text-center">
                            Connect to your server to see your schedule
                        </Text>
                    </View>
                ) : isPageLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator color="rgba(255,255,255,0.4)" />
                    </View>
                ) : settings.viewMode === "grid" ? (
                    <ScheduleGrid
                        events={selectedDayEvents}
                        settings={settings}
                        refreshControl={refreshControl}
                        header={listHeader}
                        footer={listFooter}
                        emptyLabel={`Nothing scheduled for ${format(selectedDate, "EEEE, MMM d")}`}
                    />
                ) : settings.viewMode === "list" ? (
                    <ScheduleFlatList
                        events={selectedDayEvents}
                        settings={settings}
                        refreshControl={refreshControl}
                        header={listHeader}
                        footer={listFooter}
                        emptyLabel={`Nothing scheduled for ${format(selectedDate, "EEEE, MMM d")}`}
                    />
                ) : (
                    <ScheduleTimeline
                        events={selectedDayEvents}
                        settings={settings}
                        refreshControl={refreshControl}
                        header={listHeader}
                        footer={listFooter}
                        emptyLabel={`Nothing scheduled for ${format(selectedDate, "EEEE, MMM d")}`}
                    />
                )}

                <ScheduleSettingsSheet
                    open={settingsOpen}
                    onOpenChange={setSettingsOpen}
                    settings={settings}
                    onSettingsChange={setSettings}
                />

                <MonthYearPicker
                    open={monthPickerOpen}
                    onOpenChange={setMonthPickerOpen}
                    currentDate={selectedDate}
                    onSelect={jumpToMonth}
                />
            </SafeView>
        </TabFadeView>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Classic Grid View Component
///////////////////////////////////////////////////////////////////////////////

function ScheduleGrid({
    events,
    settings,
    refreshControl,
    header,
    footer,
    emptyLabel,
}: {
    events: ScheduleEvent[]
    settings: ScheduleSettings
    refreshControl: React.ReactElement<React.ComponentProps<typeof RefreshControl>> | undefined
    header: React.ReactElement
    footer: React.ReactElement | null
    emptyLabel: string
}) {
    const { width: screenWidth } = useWindowDimensions()
    const insets = useSafeAreaInsets()
    const usableWidth = Math.max(1, screenWidth - insets.left - insets.right)
    const { cardWidth, numColumns } = React.useMemo(
        () =>
            getMediaGridLayout({
                screenWidth: usableWidth,
                horizontalPadding: GRID_PADDING,
                spacing: GRID_SPACING,
            }),
        [usableWidth],
    )
    const rowHeight = React.useMemo(() => cardWidth * 1.5 + GRID_SPACING, [cardWidth])

    const getItemLayout = React.useCallback(
        (_: ArrayLike<ScheduleEvent> | null | undefined, index: number) => {
            const rowIndex = Math.floor(index / numColumns)

            return {
                length: rowHeight,
                offset: 8 + rowIndex * rowHeight,
                index,
            }
        },
        [numColumns, rowHeight],
    )

    return (
        <Animated.View entering={FadeIn.duration(200)} className="flex-1">
            <FlatList
                key={`schedule-grid-${numColumns}`}
                data={events}
                numColumns={numColumns}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item) => `${item.mediaId}-${item.episodeNumber}-${item.dateTime}`}
                renderItem={({ item }) => (
                    <ScheduleCardWrapper item={item} settings={settings} cardWidth={cardWidth} />
                )}
                ListHeaderComponent={header}
                ListFooterComponent={footer ?? undefined}
                ListEmptyComponent={
                    <View className="items-center justify-center px-8 py-14">
                        <Ionicons name="calendar-outline" size={40} color="rgba(255,255,255,0.15)" />
                        <Text className="text-white/30 text-sm mt-3 text-center">{emptyLabel}</Text>
                    </View>
                }
                getItemLayout={getItemLayout}
                initialNumToRender={numColumns * 3}
                maxToRenderPerBatch={numColumns * 2}
                updateCellsBatchingPeriod={16}
                windowSize={7}
                removeClippedSubviews
                contentContainerStyle={{
                    gap: GRID_SPACING,
                    paddingHorizontal: Platform.isTV ? TV.gutter : GRID_PADDING,
                    paddingBottom: 80,
                    paddingTop: Platform.isTV ? TV.navInset + tvSize(12) : 8,
                }}
                columnWrapperStyle={{ gap: GRID_SPACING }}
                refreshControl={refreshControl}
            />
        </Animated.View>
    )
}

function ScheduleCardWrapper({
    item,
    settings,
    cardWidth,
}: {
    item: ScheduleEvent
    settings: ScheduleSettings
    cardWidth: number
}) {
    const media: AL_BaseAnime = React.useMemo(
        () => ({
            id: item.mediaId,
            coverImage: { large: item.image, extraLarge: item.image },
            title: { userPreferred: item.title },
            format: item.isMovie ? "MOVIE" : undefined,
            meanScore: item.rating,
        }),
        [item.mediaId, item.image, item.title, item.isMovie, item.rating],
    )

    const localTime = item.dateTime ? format(new Date(item.dateTime), timeFormatFor(settings.clock)) : item.time

    const isWatchedAndDimmed = item.isWatched && settings.indicateWatchedEpisodes

    return (
        <View style={{ width: cardWidth, opacity: isWatchedAndDimmed ? 0.45 : 1 }}>
            <MediaEntryCard
                type="anime"
                media={media}
                cardWidth={cardWidth}
                hideProgress
                preferFetchedSheetMedia
                hideLibraryBadge
                onPress={() => router.push(`/(app)/entry/anime/${item.mediaId}`)}
                overlay={
                    <View
                        className="absolute top-0 left-0 right-0 z-10"
                        style={{ height: cardWidth * 1.275 }}
                        pointerEvents="none"
                    >
                        <View className="absolute top-1.5 left-1.5 flex-row items-center gap-1">
                            <View className="bg-black/70 rounded px-1.5 py-0.5">
                                <Text className="text-[11px] font-bold text-gray-200">{localTime}</Text>
                            </View>
                        </View>

                        <View className="absolute top-1.5 right-1.5 bg-black/70 rounded px-1.5 py-0.5">
                            <Text className="text-[11px] font-bold text-white/80">
                                {item.isSeasonFinale && !item.isMovie && "FIN. "}
                                {item.isMovie ? "Movie" : "Ep. " + item.episodeNumber}
                            </Text>
                        </View>

                        {isWatchedAndDimmed && (
                            <View className="absolute bottom-1.5 right-1.5 bg-black/70 rounded-full p-1">
                                <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.5)" />
                            </View>
                        )}
                    </View>
                }
            />
        </View>
    )
}

function ScheduleEpisodeShelf({ title, episodes }: { title: string; episodes: ShelfEpisode[] }) {
    const { width } = useWindowDimensions()
    const serverStatus = useServerStatus()
    const blurAdultContent = !!serverStatus?.settings?.anilist?.blurAdultContent
    const { animeEntryListData } = useAnilistAnimeEntryListDataAtom()
    const cardWidth = React.useMemo(() => Math.max(160, Math.floor(Math.min(width * 0.54, 240))), [width])
    const initialCount = React.useMemo(
        () =>
            getHorizontalCardRenderCount({
                viewportWidth: width,
                cardWidth,
                spacing: SHELF_SPACING,
                horizontalPadding: SHELF_PADDING,
            }),
        [cardWidth, width],
    )

    if (episodes.length === 0) return null

    return (
        <View className="gap-3">
            <Text className="px-4 text-lg font-bold text-white">{title}</Text>
            <FlatList
                horizontal
                data={episodes}
                keyExtractor={(item) => `${title}-${item.baseAnime?.id}-${item.episodeNumber}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: SHELF_SPACING, paddingHorizontal: SHELF_PADDING }}
                initialNumToRender={initialCount}
                maxToRenderPerBatch={initialCount}
                windowSize={5}
                snapToInterval={cardWidth + SHELF_SPACING}
                decelerationRate="fast"
                disableIntervalMomentum
                renderItem={({ item }) => {
                    const media = item.baseAnime
                    if (!media) return null

                    const progress = animeEntryListData?.[String(media.id)]?.progress ?? 0
                    const spoiler = getEpisodeSpoilerState(serverStatus, {
                        episodeNumber: item.episodeNumber,
                        watchedProgress: progress,
                    })
                    const episodeMeta = item.episodeMetadata
                    const image =
                        (spoiler.hideThumbnail
                            ? getSpoilerSafeAnimeImage(media)
                            : episodeMeta?.image || getSpoilerSafeAnimeImage(media)) || ""
                    const badge = getShelfBadge(item)
                    const episodeTitle = getShelfTitle(item, spoiler.hideTitle)
                    const animeTitle =
                        media.title?.userPreferred || media.title?.english || media.title?.romaji || ""

                    return (
                        <EpisodeCard
                            cardWidth={cardWidth}
                            image={image}
                            imageBlurred={blurAdultContent && !!media.isAdult}
                            title={episodeTitle}
                            episodeNumber={item.episodeNumber}
                            totalEpisodes={media.episodes}
                            length={episodeMeta?.length}
                            animeTitle={animeTitle}
                            small
                            onPress={() => router.push(`/(app)/entry/anime/${media.id}`)}
                            thumbnailOverlay={
                                badge ? (
                                    <View className="absolute left-2 top-2 rounded-md bg-black/75 px-2 py-1">
                                        <Text className="text-[10px] font-semibold text-white/70">{badge}</Text>
                                    </View>
                                ) : undefined
                            }
                        />
                    )
                }}
            />
        </View>
    )
}

const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]

function MonthYearPicker({
    open,
    onOpenChange,
    currentDate,
    onSelect,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentDate: Date
    onSelect: (year: number, month: number) => void
}) {
    const [displayYear, setDisplayYear] = React.useState(() => currentDate.getFullYear())

    React.useEffect(() => {
        if (open) setDisplayYear(currentDate.getFullYear())
    }, [open, currentDate])

    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    const today = new Date()
    const todayMonth = today.getMonth()
    const todayYear = today.getFullYear()

    return (
        <SeaBottomSheet open={open} onOpenChange={onOpenChange} snapPoints={["40%"]}>
            <View className="gap-4">
                <View className="flex-row items-center justify-center gap-5">
                    <Pressable onPress={() => setDisplayYear((y) => y - 1)} hitSlop={12} className="p-2">
                        <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.6)" />
                    </Pressable>
                    <Text className="text-xl font-bold text-white min-w-[60px] text-center">
                        {displayYear}
                    </Text>
                    <Pressable onPress={() => setDisplayYear((y) => y + 1)} hitSlop={12} className="p-2">
                        <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.6)" />
                    </Pressable>
                </View>

                <View className="flex-row flex-wrap justify-center gap-2 px-2">
                    {MONTHS.map((label, monthIndex) => {
                        const isCurrentSelection = displayYear === currentYear && monthIndex === currentMonth
                        const isToday = displayYear === todayYear && monthIndex === todayMonth

                        return (
                            <Pressable
                                key={monthIndex}
                                onPress={() => onSelect(displayYear, monthIndex)}
                                className={cn(
                                    "w-[23%] items-center justify-center rounded-lg py-3",
                                    isCurrentSelection && "bg-brand-500",
                                    !isCurrentSelection && isToday && "border border-white/20",
                                    !isCurrentSelection && !isToday && "bg-white/[0.04]",
                                )}
                            >
                                <Text
                                    className={cn(
                                        "text-sm font-semibold",
                                        isCurrentSelection ? "text-black" : isToday ? "text-black" : "text-white/60",
                                    )}
                                >
                                    {label}
                                </Text>
                            </Pressable>
                        )
                    })}
                </View>
            </View>
        </SeaBottomSheet>
    )
}
