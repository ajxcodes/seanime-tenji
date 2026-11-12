import assert from "node:assert/strict"
import test from "node:test"
import { getScheduleTimeBounds, groupScheduleByHour, transformAiringSchedules } from "../src/lib/schedule-timeline.ts"

test("groups schedule items correctly by local hour", () => {
    // Construct items using local time
    const d1 = new Date(2026, 10, 8, 8, 15, 0).toISOString()
    const d2 = new Date(2026, 10, 8, 8, 45, 0).toISOString()
    const d3 = new Date(2026, 10, 8, 10, 0, 0).toISOString()
    const d4 = new Date(2026, 10, 8, 14, 30, 0).toISOString()

    const mockItems = [
        {
            mediaId: 101,
            title: "Punirunes Puni 4",
            episodeNumber: 6,
            dateTime: d1,
        },
        {
            mediaId: 102,
            title: "Onegai AiPri",
            episodeNumber: 32,
            dateTime: d2,
        },
        {
            mediaId: 103,
            title: "Pop Pap Polters",
            episodeNumber: 6,
            dateTime: d3,
        },
        {
            mediaId: 104,
            title: "Blue Box Season 2",
            episodeNumber: 5,
            dateTime: d4,
        },
    ]

    const grouped = groupScheduleByHour(mockItems)

    // Verify 3 distinct hour groups exist (8 AM, 10 AM, 2 PM)
    assert.equal(grouped.length, 3)

    const totalEpisodes = grouped.reduce((sum, g) => sum + g.episodes.length, 0)
    assert.equal(totalEpisodes, 4)

    // First group (8 AM) should contain 2 items
    assert.equal(grouped[0].hour, 8)
    assert.equal(grouped[0].hourLabel, "8 AM")
    assert.equal(grouped[0].episodes.length, 2)
    assert.equal(grouped[0].episodes[0].title, "Punirunes Puni 4")
    assert.equal(grouped[0].episodes[1].title, "Onegai AiPri")

    // Second group (10 AM)
    assert.equal(grouped[1].hour, 10)
    assert.equal(grouped[1].hourLabel, "10 AM")
    assert.equal(grouped[1].episodes.length, 1)
    assert.equal(grouped[1].episodes[0].title, "Pop Pap Polters")

    // Third group (2 PM)
    assert.equal(grouped[2].hour, 14)
    assert.equal(grouped[2].hourLabel, "2 PM")
    assert.equal(grouped[2].episodes.length, 1)
    assert.equal(grouped[2].episodes[0].title, "Blue Box Season 2")
})

test("skips items without dateTime or invalid dates", () => {
    const mockItems = [
        {
            mediaId: 201,
            title: "Unknown Time Anime",
            episodeNumber: 1,
            dateTime: undefined,
        },
        {
            mediaId: 202,
            title: "Corrupt Date Anime",
            episodeNumber: 2,
            dateTime: "invalid-date",
        },
    ]

    const grouped = groupScheduleByHour(mockItems)
    assert.equal(grouped.length, 0)
})

test("computes correct schedule min and max time bounds", () => {
    const items = [
        { dateTime: "2026-11-08T10:00:00Z" },
        { dateTime: "2026-11-15T12:00:00Z" },
        { dateTime: "2026-11-01T08:00:00Z" },
    ]

    const bounds = getScheduleTimeBounds(items)
    assert.equal(bounds.minTimestamp, new Date("2026-11-01T08:00:00Z").getTime())
    assert.equal(bounds.maxTimestamp, new Date("2026-11-15T12:00:00Z").getTime())
})

test("handles empty items for time bounds", () => {
    const emptyBounds = getScheduleTimeBounds([])
    assert.equal(emptyBounds.minTimestamp, null)
    assert.equal(emptyBounds.maxTimestamp, null)
})

test("transforms AniList airing schedules to schedule events correctly", () => {
    const rawSchedules = [
        {
            id: 1,
            episode: 5,
            airingAt: Math.floor(new Date(2026, 10, 8, 14, 30).getTime() / 1000),
            media: {
                id: 501,
                title: { userPreferred: "Sousou no Frieren Season 2" },
                coverImage: { large: "https://example.com/frieren.jpg" },
                format: "TV",
                episodes: 24,
                isAdult: false,
                meanScore: 89,
            },
        },
        {
            // Adult anime should be filtered out
            id: 2,
            episode: 1,
            airingAt: Math.floor(new Date(2026, 10, 8, 15, 0).getTime() / 1000),
            media: {
                id: 999,
                title: { userPreferred: "Adult Anime" },
                format: "TV",
                isAdult: true,
                meanScore: 60,
            },
        },
        {
            // Season finale detection
            id: 3,
            episode: 12,
            airingAt: Math.floor(new Date(2026, 10, 8, 16, 0).getTime() / 1000),
            media: {
                id: 502,
                title: { english: "Solo Leveling Season 2" },
                format: "TV",
                episodes: 12,
                isAdult: false,
                meanScore: 84,
            },
        },
        {
            // Duplicate item should be deduped
            id: 4,
            episode: 5,
            airingAt: Math.floor(new Date(2026, 10, 8, 14, 30).getTime() / 1000),
            media: {
                id: 501,
                title: { userPreferred: "Sousou no Frieren Season 2" },
                format: "TV",
                episodes: 24,
                isAdult: false,
                meanScore: 89,
            },
        },
    ]

    const userProgress = { 501: 5 } // User already watched episode 5
    const events = transformAiringSchedules(rawSchedules, userProgress)

    assert.equal(events.length, 2)

    // First event (Frieren Ep 5)
    assert.equal(events[0].mediaId, 501)
    assert.equal(events[0].title, "Sousou no Frieren Season 2")
    assert.equal(events[0].episodeNumber, 5)
    assert.equal(events[0].isWatched, true)
    assert.equal(events[0].isSeasonFinale, false)
    assert.equal(events[0].isMovie, false)
    assert.equal(events[0].rating, 89)

    // Second event (Solo Leveling Ep 12 - finale)
    assert.equal(events[1].mediaId, 502)
    assert.equal(events[1].title, "Solo Leveling Season 2")
    assert.equal(events[1].episodeNumber, 12)
    assert.equal(events[1].isWatched, false)
    assert.equal(events[1].isSeasonFinale, true)
    assert.equal(events[1].rating, 84)
})


