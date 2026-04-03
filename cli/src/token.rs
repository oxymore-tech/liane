use anyhow::{Context, Result};
use serde::Deserialize;

const API_URL: &str = "http://localhost:5000/api";

#[derive(Deserialize)]
struct AuthResponse {
    token: AuthToken,
}

#[derive(Deserialize)]
struct AuthToken {
    access_token: String,
}

pub async fn generate_token(phone: &str, code: &str) -> Result<String> {
    let client = reqwest::Client::new();

    client
        .post(format!("{API_URL}/auth/sms?phone={phone}"))
        .send()
        .await
        .context("failed to send SMS code")?
        .error_for_status()
        .context("SMS code request failed")?;

    let response: AuthResponse = client
        .post(format!("{API_URL}/auth/login"))
        .json(&serde_json::json!({ "phone": phone, "code": code }))
        .send()
        .await
        .context("failed to login")?
        .error_for_status()
        .context("login failed")?
        .json()
        .await?;

    Ok(response.token.access_token)
}
