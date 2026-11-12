import { useServerMutation, useServerQuery } from "@/api/client/requests"
import { AddUnknownMedia_Variables } from "@/api/generated/endpoint.types"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { AL_AnimeCollection, Anime_LibraryCollection, Anime_ScheduleItem, WeeklyScheduleResponse } from "@/api/generated/types"
import { useRefreshAnimeCollection } from "@/api/hooks/anilist.hooks"
import { toast } from "@/lib/utils/toast"
import { useQueryClient } from "@tanstack/react-query"

export function useGetLibraryCollection({ enabled }: { enabled?: boolean } = { enabled: true }) {
    return useServerQuery<Anime_LibraryCollection>({
        endpoint: API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.endpoint,
        method: API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.methods[0],
        queryKey: [API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.key],
        enabled: enabled,
    })
}

export function useAddUnknownMedia() {
    const queryClient = useQueryClient()
    const { mutate } = useRefreshAnimeCollection()

    return useServerMutation<AL_AnimeCollection, AddUnknownMedia_Variables>({
        endpoint: API_ENDPOINTS.ANIME_COLLECTION.AddUnknownMedia.endpoint,
        method: API_ENDPOINTS.ANIME_COLLECTION.AddUnknownMedia.methods[0],
        mutationKey: [API_ENDPOINTS.ANIME_COLLECTION.AddUnknownMedia.key],
        onSuccess: async () => {
            toast.success("Media added successfully")
            mutate(undefined, {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.LIBRARY_EXPLORER.GetLibraryExplorerFileTree.key] })
                },
            })
        },
    })
}

export function useGetAnimeCollectionSchedule({ enabled }: { enabled?: boolean } = { enabled: true }) {
    return useServerQuery<Array<Anime_ScheduleItem>>({
        endpoint: API_ENDPOINTS.ANIME_COLLECTION.GetAnimeCollectionSchedule.endpoint,
        method: API_ENDPOINTS.ANIME_COLLECTION.GetAnimeCollectionSchedule.methods[0],
        queryKey: [API_ENDPOINTS.ANIME_COLLECTION.GetAnimeCollectionSchedule.key],
        enabled: enabled,
    })
}

export function useGetAnimeScheduleWeekly({ weekStart, scope, refresh, enabled }: { weekStart?: number; scope?: "all" | "my_list"; refresh?: boolean; enabled?: boolean }) {
    return useServerQuery<WeeklyScheduleResponse>({
        endpoint: API_ENDPOINTS.ANIME_COLLECTION.GetAnimeScheduleWeekly.endpoint,
        method: API_ENDPOINTS.ANIME_COLLECTION.GetAnimeScheduleWeekly.methods[0],
        params: {
            weekStart: weekStart ?? undefined,
            scope: scope ?? "all",
            refresh: refresh ?? false,
        },
        queryKey: [API_ENDPOINTS.ANIME_COLLECTION.GetAnimeScheduleWeekly.key, weekStart, scope],
        enabled: enabled ?? true,
        staleTime: 1000 * 60 * 5, // 5 minutes — matches server TTL
        gcTime: 1000 * 60 * 30, // keep cache for 30 minutes
    })
}
