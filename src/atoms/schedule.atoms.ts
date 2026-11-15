import { AL_MediaListStatus } from "@/api/generated/types"
import { createAtomStorage } from "@/atoms/storage"
import { atomWithStorage } from "jotai/utils"
import type { Clock } from "@/lib/schedule-settings"

export type ScheduleAdult = "hide" | "show" | "only"
export type ScheduleScope = "all" | "my_list"
export type ScheduleViewMode = "timeline" | "list" | "grid"

export type ScheduleSettings = {
    /** Which AniList watch statuses to include in the schedule */
    listStatuses: AL_MediaListStatus[]
    /** Grey out episodes the user has already watched */
    indicateWatchedEpisodes: boolean
    /** Hide the missing episodes shelf */
    hideMissingEpisodes: boolean
    /** Hide the upcoming episodes shelf */
    hideUpcomingEpisodes: boolean
    /** View layout: timeline (hour-by-hour), list (all shows for day), or grid (posters) */
    viewMode: ScheduleViewMode
    /** Scope: "all" (global / all anime) or "my_list" (user watchlist only) */
    scope: ScheduleScope
    /**
     * Non-TV formats shown in the schedule. Regular TV anime is always shown.
     * Music is intentionally not offered (excluded by the server).
     */
    formats: string[]
    /** Enabled country groups: jp | cn_tw | kr | other */
    countries: string[]
    /** Adult title handling — applied server-side */
    adult: ScheduleAdult
    /** Clock: auto (device locale), 12h or 24h */
    clock: Clock
}

export const defaultScheduleSettings: ScheduleSettings = {
    listStatuses: ["CURRENT", "PLANNING", "COMPLETED", "PAUSED"],
    indicateWatchedEpisodes: true,
    hideMissingEpisodes: false,
    hideUpcomingEpisodes: false,
    viewMode: "timeline",
    scope: "all",
    formats: ["MOVIE", "TV_SHORT", "SPECIAL", "OVA", "ONA"],
    countries: ["jp", "cn_tw", "kr", "other"],
    adult: "hide",
    clock: "auto",
}

/** Merge a possibly partial (or legacy, pre-new-fields) stored value over the defaults. */
export function normalizeScheduleSettings(
    stored: Partial<ScheduleSettings> | null | undefined,
): ScheduleSettings {
    return { ...defaultScheduleSettings, ...(stored ?? {}) }
}

export const scheduleSettingsAtom = atomWithStorage<ScheduleSettings>(
    "sea-schedule-settings",
    defaultScheduleSettings,
    createAtomStorage<ScheduleSettings>(),
    { getOnInit: true },
)
