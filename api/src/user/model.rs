use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "PascalCase")]
pub enum Gender {
    Man,
    Woman,
    Unspecified,
}

#[derive(Debug, Serialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub phone: String,
    pub pseudo: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub gender: Gender,
    pub picture_url: Option<String>,
    pub is_admin: bool,
    pub is_signed_up: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct PublicUser {
    pub id: Uuid,
    pub pseudo: Option<String>,
    pub gender: Gender,
    pub picture_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUser {
    pub first_name: String,
    pub last_name: String,
    pub gender: Gender,
    pub picture_url: Option<String>,
}
