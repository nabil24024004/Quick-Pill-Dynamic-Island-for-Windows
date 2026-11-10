"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  fetchPrayerTimes,
  calculateOfflinePrayerTimes,
  getNextPrayer,
  CITY_COORDINATES
} = require("../src/services/prayer");

test("calculateOfflinePrayerTimes - returns all 5 prayers in HH:MM format", () => {
  const date = new Date("2026-11-11T12:00:00Z");
  const timings = calculateOfflinePrayerTimes(date, 25.7439, 89.2752, 6);

  assert.ok(timings.Fajr && /^\d{2}:\d{2}$/.test(timings.Fajr));
  assert.ok(timings.Dhuhr && /^\d{2}:\d{2}$/.test(timings.Dhuhr));
  assert.ok(timings.Asr && /^\d{2}:\d{2}$/.test(timings.Asr));
  assert.ok(timings.Maghrib && /^\d{2}:\d{2}$/.test(timings.Maghrib));
  assert.ok(timings.Isha && /^\d{2}:\d{2}$/.test(timings.Isha));
});

test("getNextPrayer - correctly identifies next prayer and formats countdown", () => {
  const timings = {
    Fajr: "05:00",
    Dhuhr: "12:00",
    Asr: "15:00",
    Maghrib: "17:48",
    Isha: "19:00"
  };

  // Test afternoon 16:40 (1h 8m before Maghrib)
  const afternoon = new Date("2026-11-11T16:40:00");
  const res1 = getNextPrayer(timings, afternoon);

  assert.equal(res1.next.name, "Maghrib");
  assert.equal(res1.next.time, "17:48");
  assert.equal(res1.countdownFormatted, "in 1 h 8 min");
  assert.ok(res1.progress >= 0 && res1.progress <= 1);

  // Test night 22:00 (after Isha -> Next is Fajr)
  const night = new Date("2026-11-11T22:00:00");
  const res2 = getNextPrayer(timings, night);

  assert.equal(res2.next.name, "Fajr");
  assert.equal(res2.next.time, "05:00");
  assert.ok(res2.countdownFormatted.includes("h"));
});

test("fetchPrayerTimes - handles known cities and offline fallback cleanly", async () => {
  const data = await fetchPrayerTimes("Rangpur", "Bangladesh");
  assert.ok(data.timings);
  assert.ok(data.timings.Fajr);
  assert.ok(data.timings.Maghrib);
  assert.equal(data.city, "Rangpur");
});
