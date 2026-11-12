export type ScheduleItemWithTime = {
    dateTime?: string
    episodeNumber: number
}

export type HourTimelineGroup<T> = {
    hour: number
    hourLabel: string
    episodes: T[]
}

export function groupScheduleByHour<T extends ScheduleItemWithTime>(items: T[]): HourTimelineGroup<T>[] {
    const map = new Map<number, T[]>()

    for (const item of items) {
        if (!item.dateTime) continue
        const date = new Date(item.dateTime)
        if (isNaN(date.getTime())) continue

        const hour = date.getHours()
        const list = map.get(hour) ?? []
        list.push(item)
        map.set(hour, list)
    }

    return Array.from(map.entries())
        .sort(([a], [b]) => a - b)
        .map(([hour, episodes]) => {
            const period = hour >= 12 ? "PM" : "AM"
            const displayHour = hour % 12 === 0 ? 12 : hour % 12
            return {
                hour,
                hourLabel: `${displayHour} ${period}`,
                episodes,
            }
        })
}

export function getScheduleTimeBounds(items?: Array<{ dateTime?: string }>): { minTimestamp: number | null; maxTimestamp: number | null } {
    if (!items || items.length === 0) {
        return { minTimestamp: null, maxTimestamp: null }
    }

    let min = Infinity
    let max = -Infinity

    for (const item of items) {
        if (!item.dateTime) continue
        const t = new Date(item.dateTime).getTime()
        if (isNaN(t)) continue
        if (t < min) min = t
        if (t > max) max = t
    }

    if (min === Infinity) {
        return { minTimestamp: null, maxTimestamp: null }
    }

    return { minTimestamp: min, maxTimestamp: max }
}

export type AiringScheduleInput = {
    airingAt: number
    episode: number
    id?: number
    media?: {
        id: number
        title?: {
            userPreferred?: string
            english?: string
            romaji?: string
        }
        coverImage?: {
            large?: string
            extraLarge?: string
        }
        bannerImage?: string
        format?: string
        episodes?: number
        isAdult?: boolean
        meanScore?: number
    }
}

export type TransformedScheduleEvent = {
    mediaId: number
    title: string
    time: string
    dateTime: string
    image: string
    episodeNumber: number
    isMovie: boolean
    isSeasonFinale: boolean
    isWatched: boolean
    rating?: number
    media?: AiringScheduleInput["media"]
}

export function transformAiringSchedules(
    schedules: AiringScheduleInput[] | undefined,
    userProgressMap?: Record<string | number, number>,
): TransformedScheduleEvent[] {
    if (!schedules || schedules.length === 0) return []

    const seen = new Set<string>()
    const events: TransformedScheduleEvent[] = []

    for (const item of schedules) {
        const media = item.media
        if (!media || media.isAdult || !item.airingAt) continue

        const dedupeKey = `${media.id}-${item.episode}`
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)

        const date = new Date(item.airingAt * 1000)
        if (isNaN(date.getTime())) continue

        const hours = String(date.getHours()).padStart(2, "0")
        const minutes = String(date.getMinutes()).padStart(2, "0")
        const time = `${hours}:${minutes}`

        const title =
            media.title?.userPreferred ||
            media.title?.english ||
            media.title?.romaji ||
            "Unknown Anime"

        const image = media.coverImage?.extraLarge || media.coverImage?.large || ""
        const isMovie = media.format === "MOVIE"
        const isSeasonFinale = Boolean(media.episodes && media.episodes === item.episode)

        const progress = userProgressMap?.[media.id] ?? userProgressMap?.[String(media.id)]
        const isWatched = progress != null ? progress >= item.episode : false
        const rating = media.meanScore

        events.push({
            mediaId: media.id,
            title,
            time,
            dateTime: date.toISOString(),
            image,
            episodeNumber: item.episode,
            isMovie,
            isSeasonFinale,
            isWatched,
            rating,
            media,
        })
    }

    return events
}

