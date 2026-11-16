//! Dates en français à l'heure de Paris, pour les textes produits par le serveur
//! (messages automatiques, notifications).

use chrono::{DateTime, Datelike, Duration, NaiveDate, TimeZone, Timelike, Utc, Weekday};

const DAYS: [&str; 7] = [
    "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
];
const MONTHS: [&str; 12] = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
];

/// « lundi 16 novembre à 07:30 », à l'heure de Paris.
pub fn day_and_time(at: DateTime<Utc>) -> String {
    let local = at + Duration::hours(paris_offset_hours(at));
    format!(
        "{} {} {} à {:02}:{:02}",
        DAYS[local.weekday().num_days_from_monday() as usize],
        local.day(),
        MONTHS[local.month0() as usize],
        local.hour(),
        local.minute()
    )
}

/// Heure d'été du dernier dimanche de mars au dernier dimanche d'octobre, bascule à 1 h UTC.
fn paris_offset_hours(at: DateTime<Utc>) -> i64 {
    let switch = |month| {
        let day = last_sunday(at.year(), month);
        Utc.with_ymd_and_hms(day.year(), day.month(), day.day(), 1, 0, 0)
            .single()
            .expect("valid date")
    };
    if at >= switch(3) && at < switch(10) {
        2
    } else {
        1
    }
}

fn last_sunday(year: i32, month: u32) -> NaiveDate {
    let mut day = NaiveDate::from_ymd_opt(year, month, 31).expect("31-day month");
    while day.weekday() != Weekday::Sun {
        day = day.pred_opt().expect("previous day");
    }
    day
}

#[cfg(test)]
mod tests {
    use super::*;

    fn utc(year: i32, month: u32, day: u32, hour: u32, minute: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(year, month, day, hour, minute, 0)
            .unwrap()
    }

    #[test]
    fn winter_time_is_one_hour_ahead_of_utc() {
        assert_eq!(
            day_and_time(utc(2026, 11, 16, 6, 30)),
            "lundi 16 novembre à 07:30"
        );
    }

    #[test]
    fn summer_time_is_two_hours_ahead_of_utc() {
        assert_eq!(
            day_and_time(utc(2026, 7, 14, 22, 5)),
            "mercredi 15 juillet à 00:05"
        );
    }

    #[test]
    fn switches_on_the_last_sundays_of_march_and_october() {
        assert_eq!(
            day_and_time(utc(2026, 3, 29, 0, 59)),
            "dimanche 29 mars à 01:59"
        );
        assert_eq!(
            day_and_time(utc(2026, 3, 29, 1, 0)),
            "dimanche 29 mars à 03:00"
        );
        assert_eq!(
            day_and_time(utc(2026, 10, 25, 0, 59)),
            "dimanche 25 octobre à 02:59"
        );
        assert_eq!(
            day_and_time(utc(2026, 10, 25, 1, 0)),
            "dimanche 25 octobre à 02:00"
        );
    }
}
