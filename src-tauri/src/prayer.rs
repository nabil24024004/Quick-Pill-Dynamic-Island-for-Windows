use chrono::Local;
use serde::Serialize;
use serde_json::Value;
use std::time::Duration;

#[derive(Debug, Clone, Serialize)]
pub struct PrayerTimings {
    #[serde(rename = "Fajr")]
    pub fajr: String,
    #[serde(rename = "Dhuhr")]
    pub dhuhr: String,
    #[serde(rename = "Asr")]
    pub asr: String,
    #[serde(rename = "Maghrib")]
    pub maghrib: String,
    #[serde(rename = "Isha")]
    pub isha: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct PrayerResponse {
    pub city: String,
    pub country: String,
    pub source: String,
    pub timings: PrayerTimings,
}

struct CityCoord {
    lat: f64,
    lng: f64,
    country: &'static str,
    tz_offset_hours: f64,
}

fn known_city_coord(city: &str) -> CityCoord {
    let key: String = city
        .to_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect();
    match key.as_str() {
        "rangpur" => CityCoord { lat: 25.7439, lng: 89.2752, country: "Bangladesh", tz_offset_hours: 6.0 },
        "chattogram" | "chittagong" => CityCoord { lat: 22.3569, lng: 91.7832, country: "Bangladesh", tz_offset_hours: 6.0 },
        "dhaka" => CityCoord { lat: 23.8103, lng: 90.4125, country: "Bangladesh", tz_offset_hours: 6.0 },
        "sylhet" => CityCoord { lat: 24.8949, lng: 91.8687, country: "Bangladesh", tz_offset_hours: 6.0 },
        "rajshahi" => CityCoord { lat: 24.3745, lng: 88.6042, country: "Bangladesh", tz_offset_hours: 6.0 },
        "khulna" => CityCoord { lat: 22.8456, lng: 89.5403, country: "Bangladesh", tz_offset_hours: 6.0 },
        "jakarta" => CityCoord { lat: -6.2088, lng: 106.8456, country: "Indonesia", tz_offset_hours: 7.0 },
        "makkah" | "mecca" => CityCoord { lat: 21.4225, lng: 39.8262, country: "Saudi Arabia", tz_offset_hours: 3.0 },
        "madinah" | "medina" => CityCoord { lat: 24.4672, lng: 39.6111, country: "Saudi Arabia", tz_offset_hours: 3.0 },
        "london" => CityCoord { lat: 51.5074, lng: -0.1278, country: "United Kingdom", tz_offset_hours: 0.0 },
        "newyork" => CityCoord { lat: 40.7128, lng: -74.0060, country: "United States", tz_offset_hours: -5.0 },
        _ => CityCoord { lat: 25.7439, lng: 89.2752, country: "Bangladesh", tz_offset_hours: 6.0 },
    }
}

fn format_hours_hhmm(hours: f64) -> String {
    let mut h = hours % 24.0;
    if h < 0.0 {
        h += 24.0;
    }
    let total_mins = (h * 60.0).round() as i32;
    let hh = (total_mins / 60).rem_euclid(24);
    let mm = total_mins.rem_euclid(60);
    format!("{hh:02}:{mm:02}")
}

/// Offline solar geometry prayer time calculation (Karachi 18° Fajr/Isha angles).
pub fn calculate_offline_prayer_times(lat: f64, lng: f64, tz_offset_hours: f64) -> PrayerTimings {
    let now = Local::now();
    let d_date = now.date_naive();
    let year = d_date.format("%Y").to_string().parse::<f64>().unwrap_or(2026.0);
    let month = d_date.format("%m").to_string().parse::<f64>().unwrap_or(1.0);
    let day = d_date.format("%d").to_string().parse::<f64>().unwrap_or(1.0);

    let (y, m) = if month <= 2.0 {
        (year - 1.0, month + 12.0)
    } else {
        (year, month)
    };
    let a = (y / 100.0).floor();
    let b = 2.0 - a + (a / 4.0).floor();
    let jd = (365.25 * (y + 4716.0)).floor() + (30.6001 * (m + 1.0)).floor() + day + b - 1524.5;

    let d = jd - 2451545.0;
    let g = (357.529 + 0.98560028 * d).to_radians();
    let q = 280.459 + 0.98564736 * d;
    let l = (q + 1.915 * g.sin() + 0.020 * (2.0 * g).sin()).to_radians();
    let e = (23.439 - 0.00000036 * d).to_radians();

    let decl = (e.sin() * l.sin()).asin();
    let mut ra = (e.cos() * l.sin()).atan2(l.cos()).to_degrees() / 15.0;
    ra = (ra % 24.0 + 24.0) % 24.0;

    let mut q_hrs = (q % 360.0 + 360.0) % 360.0 / 15.0;
    let mut eqt = q_hrs - ra;
    if eqt > 12.0 {
        eqt -= 24.0;
    } else if eqt < -12.0 {
        eqt += 24.0;
    }
    let _ = &mut q_hrs;

    let dhuhr = 12.0 + tz_offset_hours - lng / 15.0 - eqt;
    let lat_rad = lat.to_radians();

    let hour_angle = |angle_deg: f64| -> f64 {
        let num = -angle_deg.to_radians().sin() - lat_rad.sin() * decl.sin();
        let den = lat_rad.cos() * decl.cos();
        let cos_t = (num / den).clamp(-1.0, 1.0);
        cos_t.acos().to_degrees() / 15.0
    };

    let fajr = dhuhr - hour_angle(18.0);
    let maghrib = dhuhr + hour_angle(0.833);
    let isha = dhuhr + hour_angle(18.0);

    let asr_angle = -(1.0f64 / (1.0 + (lat_rad - decl).abs().tan())).atan().to_degrees();
    let asr = dhuhr + hour_angle(asr_angle);

    PrayerTimings {
        fajr: format_hours_hhmm(fajr),
        dhuhr: format_hours_hhmm(dhuhr + 1.0 / 60.0),
        asr: format_hours_hhmm(asr),
        maghrib: format_hours_hhmm(maghrib + 1.0 / 60.0),
        isha: format_hours_hhmm(isha),
    }
}

fn clean_hhmm(raw: Option<&Value>, fallback: &str) -> String {
    raw.and_then(|v| v.as_str())
        .map(|s| s.chars().take(5).collect::<String>())
        .filter(|s| s.len() == 5 && s.contains(':'))
        .unwrap_or_else(|| fallback.to_string())
}

#[tauri::command]
pub async fn prayer_get_timings(city: String, country: Option<String>) -> PrayerResponse {
    let trimmed_city = if city.trim().is_empty() {
        "Rangpur".to_string()
    } else {
        city.trim().to_string()
    };
    let coords = known_city_coord(&trimmed_city);
    let resolved_country = country
        .filter(|c| !c.trim().is_empty())
        .unwrap_or_else(|| coords.country.to_string());

    let url = format!(
        "https://api.aladhan.com/v1/timingsByCity?city={}&country={}&method=1",
        urlencoding::encode(&trimmed_city),
        urlencoding::encode(&resolved_country)
    );

    if let Ok(client) = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
    {
        if let Ok(resp) = client.get(&url).send().await {
            if resp.status().is_success() {
                if let Ok(json) = resp.json::<Value>().await {
                    if let Some(t) = json.pointer("/data/timings") {
                        let timings = PrayerTimings {
                            fajr: clean_hhmm(t.get("Fajr"), "04:59"),
                            dhuhr: clean_hhmm(t.get("Dhuhr"), "11:47"),
                            asr: clean_hhmm(t.get("Asr"), "14:55"),
                            maghrib: clean_hhmm(t.get("Maghrib"), "17:16"),
                            isha: clean_hhmm(t.get("Isha"), "18:35"),
                        };
                        return PrayerResponse {
                            city: trimmed_city,
                            country: resolved_country,
                            source: "api".to_string(),
                            timings,
                        };
                    }
                }
            }
        }
    }

    let offline = calculate_offline_prayer_times(coords.lat, coords.lng, coords.tz_offset_hours);
    PrayerResponse {
        city: trimmed_city,
        country: resolved_country,
        source: "offline".to_string(),
        timings: offline,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn offline_prayer_times_format_valid_hhmm() {
        let t = calculate_offline_prayer_times(25.7439, 89.2752, 6.0);
        for s in [&t.fajr, &t.dhuhr, &t.asr, &t.maghrib, &t.isha] {
            assert_eq!(s.len(), 5);
            assert_eq!(s.as_bytes()[2], b':');
        }
    }
}
