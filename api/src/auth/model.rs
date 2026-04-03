use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthUser {
    pub id: Uuid,
    pub is_admin: bool,
    pub is_signed_up: bool,
    pub iat: i64,
    pub exp: i64,
}

#[derive(Debug, Deserialize)]
pub struct AuthRequest {
    pub phone: String,
    pub code: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub user: AuthUser,
    pub token: AuthToken,
}

#[derive(Debug, Serialize)]
pub struct AuthToken {
    pub access_token: String,
}
