use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// L'utilisateur d'une requête : sa session existe encore, `is_admin` vient de la base.
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: Uuid,
    pub is_admin: bool,
    pub session_id: Uuid,
}

/// Contenu du jeton : il désigne une session, il ne porte aucun droit.
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub sid: Uuid,
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
    pub user: LoggedUser,
    pub token: AuthToken,
}

#[derive(Debug, Serialize)]
pub struct LoggedUser {
    pub id: Uuid,
    pub is_admin: bool,
}

#[derive(Debug, Serialize)]
pub struct AuthToken {
    pub access_token: String,
}
