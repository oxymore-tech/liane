use chrono::{DateTime, Months, NaiveDate, Utc};
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

use crate::trip::model::{TripRole, TripStop, TripUser};

/// `Disabled` : Liane n'a pas de tarif de partage des frais, personne n'a de porte-monnaie.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "kind")]
pub enum Wallet {
    Disabled,
    Closed {
        cents_per_km: i32,
    },
    Open {
        cents_per_km: i32,
        opened_at: DateTime<Utc>,
    },
}

impl Wallet {
    pub fn of(cents_per_km: Option<i32>, opened_at: Option<DateTime<Utc>>) -> Self {
        match (cents_per_km, opened_at) {
            (None, _) => Wallet::Disabled,
            (Some(cents_per_km), None) => Wallet::Closed { cents_per_km },
            (Some(cents_per_km), Some(opened_at)) => Wallet::Open {
                cents_per_km,
                opened_at,
            },
        }
    }
}

/// La part des frais d'un passager, en centimes : le tarif appliqué à la distance de son tronçon.
pub fn cost_share_cents(distance_meters: i32, cents_per_km: i32) -> i32 {
    ((i64::from(distance_meters) * i64::from(cents_per_km) + 500) / 1000) as i32
}

/// Un mois de relevé, repéré par son premier jour.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Month(NaiveDate);

impl Month {
    pub fn first_day(self) -> NaiveDate {
        self.0
    }

    pub fn last_day(self) -> NaiveDate {
        (self.0 + Months::new(1))
            .pred_opt()
            .expect("last day of month")
    }

    /// Lit « 2026-11 ».
    pub fn parse(text: &str) -> Option<Self> {
        NaiveDate::parse_from_str(&format!("{text}-01"), "%Y-%m-%d")
            .ok()
            .map(Month)
    }
}

#[derive(Debug, FromRow)]
pub struct StatementRow {
    pub trip_id: Uuid,
    pub passenger_id: Uuid,
    pub counterpart_id: Uuid,
    pub counterpart_pseudo: Option<String>,
    pub departure_time: DateTime<Utc>,
    pub from_id: Uuid,
    pub from_label: String,
    pub from_city: String,
    pub to_id: Uuid,
    pub to_label: String,
    pub to_city: String,
    pub distance_meters: i32,
    pub cents_per_km: i32,
    pub amount_cents: i32,
}

/// `role` est celui du titulaire du relevé : passager, il doit `amount_cents` à `counterpart` ;
/// conducteur, il les reçoit de lui.
#[derive(Debug, Serialize)]
pub struct StatementEntry {
    pub trip_id: Uuid,
    pub role: TripRole,
    pub counterpart: TripUser,
    pub departure_time: DateTime<Utc>,
    pub from_stop: TripStop,
    pub to_stop: TripStop,
    pub distance_meters: i32,
    pub cents_per_km: i32,
    pub amount_cents: i32,
}

/// Ce que le titulaire doit et ce qu'il reçoit pour les trajets d'un mois, sans compensation entre
/// les deux. Tout est dû à `due_on`, le dernier jour du mois.
#[derive(Debug, Serialize)]
pub struct Statement {
    pub month: NaiveDate,
    pub due_on: NaiveDate,
    pub owed_cents: i64,
    pub received_cents: i64,
    pub entries: Vec<StatementEntry>,
}

impl Statement {
    pub fn new(month: Month, entries: Vec<StatementEntry>) -> Self {
        let total = |role| {
            entries
                .iter()
                .filter(|entry| entry.role == role)
                .map(|entry| i64::from(entry.amount_cents))
                .sum()
        };
        Statement {
            month: month.first_day(),
            due_on: month.last_day(),
            owed_cents: total(TripRole::Passenger),
            received_cents: total(TripRole::Driver),
            entries,
        }
    }
}

#[cfg(test)]
mod tests {
    use chrono::TimeZone;

    use super::*;

    fn entry(role: TripRole, amount_cents: i32) -> StatementEntry {
        let stop = || TripStop {
            id: Uuid::nil(),
            label: "Mairie".to_string(),
            city: "Florac".to_string(),
        };
        StatementEntry {
            trip_id: Uuid::nil(),
            role,
            counterpart: TripUser {
                id: Uuid::nil(),
                pseudo: None,
            },
            departure_time: Utc.with_ymd_and_hms(2026, 11, 16, 6, 30, 0).unwrap(),
            from_stop: stop(),
            to_stop: stop(),
            distance_meters: 10_000,
            cents_per_km: 10,
            amount_cents,
        }
    }

    #[test]
    fn a_wallet_exists_only_when_liane_has_a_rate() {
        let opened_at = Utc.with_ymd_and_hms(2026, 11, 1, 8, 0, 0).unwrap();
        assert_eq!(Wallet::of(None, None), Wallet::Disabled);
        assert_eq!(Wallet::of(None, Some(opened_at)), Wallet::Disabled);
        assert_eq!(
            Wallet::of(Some(10), None),
            Wallet::Closed { cents_per_km: 10 }
        );
        assert_eq!(
            Wallet::of(Some(10), Some(opened_at)),
            Wallet::Open {
                cents_per_km: 10,
                opened_at
            }
        );
    }

    #[test]
    fn the_cost_share_is_the_rate_applied_to_the_distance_rounded_to_the_cent() {
        assert_eq!(cost_share_cents(36_000, 10), 360);
        assert_eq!(cost_share_cents(10_540, 10), 105);
        assert_eq!(cost_share_cents(10_550, 10), 106);
        assert_eq!(cost_share_cents(400, 1), 0);
        assert_eq!(cost_share_cents(0, 10), 0);
    }

    #[test]
    fn a_month_is_read_as_year_and_month_and_is_due_on_its_last_day() {
        let day = |year, month, day| NaiveDate::from_ymd_opt(year, month, day).unwrap();
        let november = Month::parse("2026-11").unwrap();
        assert_eq!(november.first_day(), day(2026, 11, 1));
        assert_eq!(november.last_day(), day(2026, 11, 30));
        assert_eq!(
            Month::parse("2028-02").unwrap().last_day(),
            day(2028, 2, 29)
        );
        assert_eq!(
            Month::parse("2026-12").unwrap().last_day(),
            day(2026, 12, 31)
        );
        for refused in ["2026", "2026-13", "2026-11-05", "novembre"] {
            assert_eq!(Month::parse(refused), None);
        }
    }

    #[test]
    fn a_statement_totals_what_is_owed_and_what_is_received_without_netting() {
        let statement = Statement::new(
            Month::parse("2026-11").unwrap(),
            vec![
                entry(TripRole::Passenger, 150),
                entry(TripRole::Driver, 400),
                entry(TripRole::Passenger, 75),
            ],
        );
        assert_eq!(statement.owed_cents, 225);
        assert_eq!(statement.received_cents, 400);
        assert_eq!(statement.entries.len(), 3);
    }
}
