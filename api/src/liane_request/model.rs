use chrono::{DateTime, NaiveTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::rallying_point::model::RallyingPoint;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(try_from = "String")]
#[sqlx(transparent)]
pub struct WeekDays(String);

impl TryFrom<String> for WeekDays {
    type Error = String;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        let is_valid = value.len() == 7 && value.chars().all(|day| day == '0' || day == '1');
        if is_valid {
            Ok(Self(value))
        } else {
            Err("week_days must be 7 characters of 0 or 1".to_string())
        }
    }
}

#[derive(Debug, FromRow)]
pub struct LianeRequestRow {
    pub id: Uuid,
    pub name: String,
    pub waypoints: Vec<Uuid>,
    pub round_trip: bool,
    pub arrive_before: NaiveTime,
    pub return_after: NaiveTime,
    pub can_drive: bool,
    pub week_days: WeekDays,
    pub is_enabled: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct LianeRequest {
    pub id: Uuid,
    pub name: String,
    pub waypoints: Vec<RallyingPoint>,
    pub round_trip: bool,
    pub arrive_before: NaiveTime,
    pub return_after: NaiveTime,
    pub can_drive: bool,
    pub week_days: WeekDays,
    pub is_enabled: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct LianeRequestInput {
    #[serde(default)]
    pub name: String,
    pub waypoints: Vec<Uuid>,
    pub round_trip: bool,
    pub arrive_before: NaiveTime,
    pub return_after: NaiveTime,
    pub can_drive: bool,
    pub week_days: WeekDays,
    #[serde(default = "enabled_by_default")]
    pub is_enabled: bool,
}

fn enabled_by_default() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::WeekDays;

    #[test]
    fn week_days_accepts_seven_binary_flags() {
        assert!(WeekDays::try_from("1111100".to_string()).is_ok());
    }

    #[test]
    fn week_days_rejects_wrong_length_or_characters() {
        assert!(WeekDays::try_from("11111".to_string()).is_err());
        assert!(WeekDays::try_from("11111002".to_string()).is_err());
        assert!(WeekDays::try_from("11111x0".to_string()).is_err());
    }
}
