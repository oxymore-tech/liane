use std::time::Duration;

use axum::http::StatusCode;
use axum::{Extension, Json};
use serde::Serialize;
use sqlx::PgPool;

use crate::config::Config;
use crate::db;

const OSRM_TIMEOUT: Duration = Duration::from_secs(2);

#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Check {
    Ok,
    Failed,
    /// OSRM n'est pas configuré : les tracés sont des lignes droites.
    Disabled,
}

#[derive(Debug, Serialize)]
pub struct Health {
    pub status: Check,
    pub database: Check,
    pub migrations: Check,
    pub osrm: Check,
}

/// 200 si la base répond et que les migrations sont appliquées, 503 sinon.
/// OSRM est indiqué sans peser sur le statut : sans lui, l'API se replie sur la ligne droite.
pub async fn health(
    Extension(db): Extension<PgPool>,
    Extension(config): Extension<Config>,
) -> (StatusCode, Json<Health>) {
    let database = check(sqlx::query("SELECT 1").execute(&db).await.is_ok());
    let migrations = check(db::migrations_applied(&db).await.unwrap_or(false));
    let osrm = osrm(&config.osrm_url).await;
    let status = check(database == Check::Ok && migrations == Check::Ok);

    let code = if status == Check::Ok {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };
    (
        code,
        Json(Health {
            status,
            database,
            migrations,
            osrm,
        }),
    )
}

fn check(is_ok: bool) -> Check {
    if is_ok { Check::Ok } else { Check::Failed }
}

/// Toute réponse HTTP d'OSRM (même une erreur de requête) prouve qu'il est joignable.
async fn osrm(osrm_url: &str) -> Check {
    if osrm_url.is_empty() {
        return Check::Disabled;
    }
    let url = format!("{}/nearest/v1/driving/3.5,44.5", osrm_url.trim_end_matches('/'));
    let answered = reqwest::Client::new()
        .get(url)
        .timeout(OSRM_TIMEOUT)
        .send()
        .await
        .is_ok_and(|response| !response.status().is_server_error());
    check(answered)
}
