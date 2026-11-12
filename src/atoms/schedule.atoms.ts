import { AL_MediaListStatus } from "@/api/generated/types"
import { createAtomStorage } from "@/atoms/storage"
import { atomWithStorage } from "jotai/utils"

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
    viewMode: "timeline" | "list" | "grid"
    /** Scope: "all" (global / all anime) or "my_list" (user watchlist only) */
    scope: "all" | "my_list"
}

const defaultSettings: ScheduleSettings = {
    listStatuses: ["CURRENT", "PLANNING", "COMPLETED", "PAUSED"],
    indicateWatchedEpisodes: true,
    hideMissingEpisodes: false,
    hideUpcomingEpisodes: false,
    viewMode: "timeline",
    scope: "all",
}

export const scheduleSettingsAtom = atomWithStorage<ScheduleSettings>(
    "sea-schedule-settings",
    defaultSettings,
    createAtomStorage<ScheduleSettings>(),
    { getOnInit: true },
)
