//! Règles des trajets, sans base de données : fenêtres de temps, ordre des gestes, partage de frais.

use chrono::{DateTime, Duration, Utc};

use crate::config::INDICATIVE_COST_SHARING_CENTS_PER_KM;
use crate::trip::model::{GestureKind, GestureWindow, TripState};

pub const MIN_SEAT_COUNT: i32 = 1;
pub const MAX_SEAT_COUNT: i32 = 8;
/// Un trajet se propose pour une heure à venir (à quelques minutes près) et pas trop lointaine.
pub const DEPARTURE_PAST_TOLERANCE_SECONDS: i64 = 5 * 60;
pub const MAX_DAYS_AHEAD: i64 = 60;
/// « Je démarre » / « Je monte » : accepté de 30 min avant à 3 h après l'heure de départ prévue.
pub const START_OPENS_BEFORE_SECONDS: i64 = 30 * 60;
pub const START_CLOSES_AFTER_SECONDS: i64 = 3 * 3600;
/// « J'arrive » / « Je descends » : accepté jusqu'à 12 h après l'heure de départ prévue.
pub const END_CLOSES_AFTER_SECONDS: i64 = 12 * 3600;

/// Le texte est renvoyé tel quel avec le statut 409 : l'interface s'en sert pour expliquer le refus.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Refusal {
    TripCanceled,
    TripAlreadyStarted,
    TripClosed,
    TripFull,
    AlreadyBooked,
    DriverCannotBook,
    AlreadyOnBoard,
    TooEarly,
    TooLate,
    AlreadyDone,
    StartFirst,
}

impl Refusal {
    pub fn code(self) -> &'static str {
        match self {
            Refusal::TripCanceled => "TripCanceled",
            Refusal::TripAlreadyStarted => "TripAlreadyStarted",
            Refusal::TripClosed => "TripClosed",
            Refusal::TripFull => "TripFull",
            Refusal::AlreadyBooked => "AlreadyBooked",
            Refusal::DriverCannotBook => "DriverCannotBook",
            Refusal::AlreadyOnBoard => "AlreadyOnBoard",
            Refusal::TooEarly => "TooEarly",
            Refusal::TooLate => "TooLate",
            Refusal::AlreadyDone => "AlreadyDone",
            Refusal::StartFirst => "StartFirst",
        }
    }
}

pub fn gesture_window(departure_time: DateTime<Utc>) -> GestureWindow {
    GestureWindow {
        start_opens_at: departure_time - Duration::seconds(START_OPENS_BEFORE_SECONDS),
        start_closes_at: departure_time + Duration::seconds(START_CLOSES_AFTER_SECONDS),
        end_closes_at: departure_time + Duration::seconds(END_CLOSES_AFTER_SECONDS),
    }
}

pub fn is_valid_departure(departure_time: DateTime<Utc>, now: DateTime<Utc>) -> bool {
    departure_time >= now - Duration::seconds(DEPARTURE_PAST_TOLERANCE_SECONDS)
        && departure_time <= now + Duration::days(MAX_DAYS_AHEAD)
}

/// À venir ou en cours : pas encore parti et dans la fenêtre de départ, ou parti et pas encore périmé.
pub fn is_open(state: TripState, departure_time: DateTime<Utc>, now: DateTime<Utc>) -> bool {
    let window = gesture_window(departure_time);
    match state {
        TripState::Planned => now < window.start_closes_at,
        TripState::Started => now < window.end_closes_at,
        TripState::Finished | TripState::Canceled => false,
    }
}

/// Un occupant déclare d'abord le début puis la fin de son trajet, une seule fois chacun,
/// dans la fenêtre de temps du trajet. Rien n'est accepté sur un trajet annulé.
pub fn check_gesture(
    kind: GestureKind,
    state: TripState,
    departure_time: DateTime<Utc>,
    now: DateTime<Utc>,
    has_started: bool,
    has_ended: bool,
) -> Result<(), Refusal> {
    if state == TripState::Canceled {
        return Err(Refusal::TripCanceled);
    }
    let window = gesture_window(departure_time);
    match kind {
        GestureKind::Start => {
            if has_started {
                Err(Refusal::AlreadyDone)
            } else if now < window.start_opens_at {
                Err(Refusal::TooEarly)
            } else if now > window.start_closes_at {
                Err(Refusal::TooLate)
            } else {
                Ok(())
            }
        }
        GestureKind::End => {
            if has_ended {
                Err(Refusal::AlreadyDone)
            } else if !has_started {
                Err(Refusal::StartFirst)
            } else if now > window.end_closes_at {
                Err(Refusal::TooLate)
            } else {
                Ok(())
            }
        }
    }
}

/// Le geste que l'occupant peut faire maintenant, s'il y en a un.
pub fn next_gesture(
    state: TripState,
    departure_time: DateTime<Utc>,
    now: DateTime<Utc>,
    has_started: bool,
    has_ended: bool,
) -> Option<GestureKind> {
    [GestureKind::Start, GestureKind::End]
        .into_iter()
        .find(|kind| {
            check_gesture(*kind, state, departure_time, now, has_started, has_ended).is_ok()
        })
}

/// Partage de frais indicatif d'un passager, en centimes : le barème au kilomètre appliqué à son
/// tronçon, divisé par le nombre d'occupants de la voiture (conducteur compris).
pub fn indicative_contribution_cents(distance_meters: i32, passenger_count: i64) -> i32 {
    let occupants = (passenger_count + 1) as f64;
    let whole_cost =
        f64::from(distance_meters) / 1000.0 * INDICATIVE_COST_SHARING_CENTS_PER_KM as f64;
    (whole_cost / occupants).round() as i32
}

#[cfg(test)]
mod tests {
    use chrono::TimeZone;

    use super::*;

    fn departure() -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2026, 11, 16, 6, 30, 0).unwrap()
    }

    fn at(minutes_after_departure: i64) -> DateTime<Utc> {
        departure() + Duration::minutes(minutes_after_departure)
    }

    fn check(
        kind: GestureKind,
        state: TripState,
        minutes: i64,
        has_started: bool,
        has_ended: bool,
    ) -> Result<(), Refusal> {
        check_gesture(
            kind,
            state,
            departure(),
            at(minutes),
            has_started,
            has_ended,
        )
    }

    #[test]
    fn start_is_accepted_only_around_the_planned_departure() {
        use GestureKind::Start;
        use TripState::Planned;
        assert_eq!(
            check(Start, Planned, -31, false, false),
            Err(Refusal::TooEarly)
        );
        assert_eq!(check(Start, Planned, -30, false, false), Ok(()));
        assert_eq!(check(Start, Planned, 180, false, false), Ok(()));
        assert_eq!(
            check(Start, Planned, 181, false, false),
            Err(Refusal::TooLate)
        );
    }

    #[test]
    fn end_requires_a_start_and_closes_twelve_hours_after_departure() {
        use GestureKind::End;
        use TripState::Started;
        assert_eq!(
            check(End, Started, 10, false, false),
            Err(Refusal::StartFirst)
        );
        assert_eq!(check(End, Started, 10, true, false), Ok(()));
        assert_eq!(check(End, Started, 720, true, false), Ok(()));
        assert_eq!(check(End, Started, 721, true, false), Err(Refusal::TooLate));
    }

    #[test]
    fn a_gesture_is_never_accepted_twice_nor_on_a_canceled_trip() {
        use GestureKind::{End, Start};
        assert_eq!(
            check(Start, TripState::Started, 5, true, false),
            Err(Refusal::AlreadyDone)
        );
        assert_eq!(
            check(End, TripState::Finished, 50, true, true),
            Err(Refusal::AlreadyDone)
        );
        assert_eq!(
            check(Start, TripState::Canceled, 0, false, false),
            Err(Refusal::TripCanceled)
        );
        assert_eq!(
            check(End, TripState::Canceled, 0, true, false),
            Err(Refusal::TripCanceled)
        );
    }

    #[test]
    fn next_gesture_follows_the_order_and_the_window() {
        use TripState::{Canceled, Finished, Planned, Started};
        let next = |state, minutes, started, ended| {
            next_gesture(state, departure(), at(minutes), started, ended)
        };
        assert_eq!(next(Planned, -60, false, false), None);
        assert_eq!(next(Planned, 0, false, false), Some(GestureKind::Start));
        assert_eq!(next(Started, 20, true, false), Some(GestureKind::End));
        assert_eq!(next(Finished, 40, true, true), None);
        assert_eq!(next(Planned, 200, false, false), None);
        assert_eq!(next(Canceled, 0, false, false), None);
    }

    #[test]
    fn a_trip_stays_open_until_it_ends_is_canceled_or_expires() {
        assert!(is_open(TripState::Planned, departure(), at(-600)));
        assert!(is_open(TripState::Planned, departure(), at(179)));
        assert!(!is_open(TripState::Planned, departure(), at(181)));
        assert!(is_open(TripState::Started, departure(), at(600)));
        assert!(!is_open(TripState::Started, departure(), at(721)));
        assert!(!is_open(TripState::Finished, departure(), at(30)));
        assert!(!is_open(TripState::Canceled, departure(), at(-600)));
    }

    #[test]
    fn departure_must_be_soon_enough_and_not_in_the_past() {
        let now = departure();
        assert!(is_valid_departure(now - Duration::minutes(4), now));
        assert!(!is_valid_departure(now - Duration::minutes(6), now));
        assert!(is_valid_departure(now + Duration::days(60), now));
        assert!(!is_valid_departure(now + Duration::days(61), now));
    }

    #[test]
    fn indicative_contribution_splits_the_cost_between_occupants() {
        assert_eq!(indicative_contribution_cents(36_000, 1), 540);
        assert_eq!(indicative_contribution_cents(36_000, 2), 360);
        assert_eq!(indicative_contribution_cents(10_500, 3), 79);
        assert_eq!(indicative_contribution_cents(0, 1), 0);
    }
}
