import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
    countryGroupOf,
    detectHour12,
    hourLabelFormatFor,
    isAdultVisible,
    isCountryVisible,
    isFormatVisible,
    resolveHour12,
    timeFormatFor,
} from "../src/lib/schedule-settings.ts"

describe("isAdultVisible", () => {
    it("honors hide/show/only", () => {
        assert.equal(isAdultVisible(true, "hide"), false)
        assert.equal(isAdultVisible(false, "hide"), true)
        assert.equal(isAdultVisible(undefined, "hide"), true)
        assert.equal(isAdultVisible(true, "show"), true)
        assert.equal(isAdultVisible(false, "show"), true)
        assert.equal(isAdultVisible(true, "only"), true)
        assert.equal(isAdultVisible(false, "only"), false)
        assert.equal(isAdultVisible(undefined, "only"), false)
    })
})

describe("countryGroupOf", () => {
    it("maps known country codes to groups", () => {
        assert.equal(countryGroupOf("JP"), "jp")
        assert.equal(countryGroupOf("CN"), "cn_tw")
        assert.equal(countryGroupOf("TW"), "cn_tw")
        assert.equal(countryGroupOf("KR"), "kr")
        assert.equal(countryGroupOf("US"), "other")
        assert.equal(countryGroupOf(undefined), "other")
        assert.equal(countryGroupOf(null), "other")
        assert.equal(countryGroupOf("jp"), "jp") // case-insensitive
    })
})

describe("isCountryVisible", () => {
    it("shows only enabled groups", () => {
        const all = ["jp", "cn_tw", "kr", "other"]
        assert.equal(isCountryVisible("JP", all), true)
        assert.equal(isCountryVisible("CN", ["jp"]), false)
        assert.equal(isCountryVisible("KR", ["kr"]), true)
        assert.equal(isCountryVisible(undefined, ["other"]), true)
        assert.equal(isCountryVisible("US", ["jp"]), false)
        assert.equal(isCountryVisible("US", ["other"]), true)
    })
})

describe("isFormatVisible", () => {
    it("always shows TV", () => {
        assert.equal(isFormatVisible("TV", []), true)
        assert.equal(isFormatVisible("TV", ["MOVIE"]), true)
    })

    it("shows unknown formats (lenient against older servers)", () => {
        assert.equal(isFormatVisible(undefined, []), true)
        assert.equal(isFormatVisible(null, []), true)
    })

    it("gates non-TV formats behind the enabled list", () => {
        const enabled = ["MOVIE", "SPECIAL"]
        assert.equal(isFormatVisible("MOVIE", enabled), true)
        assert.equal(isFormatVisible("SPECIAL", enabled), true)
        assert.equal(isFormatVisible("OVA", enabled), false)
        assert.equal(isFormatVisible("ONA", enabled), false)
        assert.equal(isFormatVisible("TV_SHORT", enabled), false)
        assert.equal(isFormatVisible("MUSIC", enabled), false)
    })
})

describe("clock resolution", () => {
    it("resolves auto to a boolean from the locale", () => {
        assert.equal(typeof detectHour12(), "boolean")
        assert.equal(typeof resolveHour12("auto"), "boolean")
    })

    it("forces 12h/24h regardless of locale", () => {
        assert.equal(resolveHour12("12h"), true)
        assert.equal(resolveHour12("24h"), false)
    })

    it("picks date-fns patterns per resolved clock", () => {
        assert.equal(timeFormatFor("12h"), "h:mm a")
        assert.equal(timeFormatFor("24h"), "HH:mm")
        assert.equal(hourLabelFormatFor("12h"), "h a")
        assert.equal(hourLabelFormatFor("24h"), "HH:00")
    })
})
