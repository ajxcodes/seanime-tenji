/**
 * Shared helpers for the weekly schedule: format/country visibility,
 * clock resolution and time formatting. Pure — safe to unit test.
 */

/**
 * Toggleable formats. Regular TV anime is always shown, so it is not listed here.
 * MUSIC is intentionally not offered — it is excluded by the server's queries.
 */
export const FORMAT_OPTIONS: { label: string; value: string }[] = [
    { label: "Movie", value: "MOVIE" },
    { label: "TV Short", value: "TV_SHORT" },
    { label: "Special", value: "SPECIAL" },
    { label: "OVA", value: "OVA" },
    { label: "ONA", value: "ONA" },
]

export const COUNTRY_OPTIONS: { label: string; value: string }[] = [
    { label: "Japan", value: "jp" },
    { label: "China / Taiwan", value: "cn_tw" },
    { label: "South Korea", value: "kr" },
    { label: "Other", value: "other" },
]

export type CountryGroup = "jp" | "cn_tw" | "kr" | "other"
export type Clock = "auto" | "12h" | "24h"
export type AdultMode = "hide" | "show" | "only"

/** Adult visibility for items that carry a boolean isAdult flag (no server filter). */
export function isAdultVisible(isAdult: boolean | null | undefined, mode: AdultMode): boolean {
    const adult = isAdult === true
    if (mode === "show") return true
    if (mode === "only") return adult
    return !adult // hide
}

export function countryGroupOf(code?: string | null): CountryGroup {
    if (!code) return "other"
    switch (code.toUpperCase()) {
        case "JP":
            return "jp"
        case "CN":
        case "TW":
            return "cn_tw"
        case "KR":
            return "kr"
        default:
            return "other"
    }
}

export function isCountryVisible(code: string | null | undefined, enabledGroups: string[]): boolean {
    return enabledGroups.includes(countryGroupOf(code))
}

export function isFormatVisible(format: string | null | undefined, enabledFormats: string[]): boolean {
    if (!format) return true
    if (format === "TV") return true
    return enabledFormats.includes(format)
}

let cachedHour12: boolean | null = null

/** Detect whether the device locale renders times in 12-hour format (e.g. "1 PM"). */
export function detectHour12(): boolean {
    if (cachedHour12 === null) {
        try {
            // 13:00 — renders as "1 PM" in 12h locales and "13" in 24h locales.
            const s = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(new Date(2020, 0, 1, 13, 0))
            cachedHour12 = /[aApP]\.?[mM]\.?/.test(s)
        }
        catch {
            cachedHour12 = false
        }
    }
    return cachedHour12
}

export function resolveHour12(clock: Clock): boolean {
    if (clock === "auto") return detectHour12()
    return clock === "12h"
}

/** date-fns pattern for a wall clock time. */
export function timeFormatFor(clock: Clock): string {
    return resolveHour12(clock) ? "h:mm a" : "HH:mm"
}

/** date-fns pattern for an hourly axis label (e.g. "3 PM" or "15:00"). */
export function hourLabelFormatFor(clock: Clock): string {
    return resolveHour12(clock) ? "h a" : "HH:00"
}
