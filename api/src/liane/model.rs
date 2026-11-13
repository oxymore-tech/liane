use chrono::{DateTime, NaiveTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::liane_request::model::WeekDays;
use crate::rallying_point::model::RallyingPoint;
use crate::user::model::{Gender, PublicUser};

#[derive(Debug, FromRow)]
pub struct LianeRow {
    pub id: Uuid,
    pub waypoints: Vec<Uuid>,
    pub round_trip: bool,
    pub arrive_before: NaiveTime,
    pub return_after: NaiveTime,
    pub week_days: WeekDays,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
pub struct LianeMemberRow {
    pub liane_id: Uuid,
    #[sqlx(flatten)]
    pub user: PublicUser,
    pub liane_request_id: Uuid,
    pub joined_at: DateTime<Utc>,
    pub is_pending: bool,
}

#[derive(Debug, Serialize)]
pub struct Liane {
    pub id: Uuid,
    pub waypoints: Vec<RallyingPoint>,
    pub round_trip: bool,
    pub arrive_before: NaiveTime,
    pub return_after: NaiveTime,
    pub week_days: WeekDays,
    pub created_at: DateTime<Utc>,
    pub members: Vec<LianeMember>,
}

#[derive(Debug, Serialize)]
pub struct LianeMember {
    pub user: PublicUser,
    pub liane_request_id: Uuid,
    pub joined_at: DateTime<Utc>,
    pub is_pending: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateLiane {
    pub liane_request_id: Uuid,
    pub target_liane_request_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct JoinLiane {
    pub liane_request_id: Uuid,
}

#[derive(Debug, FromRow)]
pub struct MatchRow {
    pub liane_request_id: Uuid,
    pub user_id: Uuid,
    pub pseudo: Option<String>,
    pub gender: Gender,
    pub picture_url: Option<String>,
    pub name: String,
    pub waypoints: Vec<Uuid>,
    pub round_trip: bool,
    pub arrive_before: NaiveTime,
    pub return_after: NaiveTime,
    pub week_days: WeekDays,
    pub common_week_days: WeekDays,
    pub liane_id: Option<Uuid>,
    pub score: f64,
}

#[derive(Debug, Serialize)]
#[serde(tag = "state")]
pub enum LianeRequestState {
    Attached { liane: Liane },
    Detached { matches: Vec<LianeMatch> },
}

#[derive(Debug, Serialize)]
pub struct LianeMatch {
    pub score: f64,
    pub common_week_days: WeekDays,
    pub target: MatchTarget,
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind")]
pub enum MatchTarget {
    Request { request: MatchedRequest },
    Liane { liane: Liane },
}

#[derive(Debug, Serialize)]
pub struct MatchedRequest {
    pub id: Uuid,
    pub name: String,
    pub user: PublicUser,
    pub waypoints: Vec<RallyingPoint>,
    pub round_trip: bool,
    pub arrive_before: NaiveTime,
    pub return_after: NaiveTime,
    pub week_days: WeekDays,
}
