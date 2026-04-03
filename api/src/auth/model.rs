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
