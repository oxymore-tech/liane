use std::env::var;
use std::net::SocketAddr;
use std::time::Duration;

use axum::http::{self, Method};
use clap::Parser;
use dotenvy::dotenv;
use tokio::net::TcpListener;
use tokio::select;
use tokio::signal::unix::{SignalKind, signal};
use tower_http::cors::CorsLayer;
use tower_http::trace;
use tower_http::trace::TraceLayer;
use tracing::{Level, error, info, warn};

use api::auth::sms::SmsGateway;
use api::config::{PushProvider, Settings, SmsProvider};
use api::db::init_db;
use api::error::{AppError, Result};
use api::notification::Notifier;
use api::router::app;

/// Les fils en direct (SSE) ne se ferment pas d'eux-mêmes : passé ce délai, l'arrêt est forcé.
const SHUTDOWN_GRACE: Duration = Duration::from_secs(10);

#[derive(Parser)]
struct Args {
    #[arg(short, long)]
    debug: bool,
    /// Interroge GET /api/health de l'instance locale et sort avec 0 (saine) ou 1 : pour le HEALTHCHECK du conteneur.
    #[arg(long)]
    health: bool,
}

#[tokio::main]
async fn main() {
    let args = Args::parse();
    dotenv().ok();

    if args.health {
        std::process::exit(if is_healthy().await { 0 } else { 1 });
    }

    configure_logger(args.debug);

    if let Err(err) = try_main().await {
        error!("{:?}", err);
        std::process::exit(1);
    }
}

/// `LOG_FORMAT=json` (par défaut hors compilation de développement) ou `text`.
fn configure_logger(debug: bool) {
    let level = if debug { Level::DEBUG } else { Level::INFO };
    let default_format = if cfg!(debug_assertions) { "text" } else { "json" };
    let format = var("LOG_FORMAT").unwrap_or_else(|_| default_format.to_string());

    if format == "json" {
        tracing_subscriber::fmt()
            .json()
            .with_max_level(level)
            .with_current_span(false)
            .init();
    } else {
        tracing_subscriber::fmt()
            .with_target(false)
            .with_max_level(level)
            .compact()
            .init();
    }
}

async fn try_main() -> Result<()> {
    let settings = Settings::load().map_err(AppError::Unexpected)?;
    announce(&settings);

    let pool = init_db(&settings.database_url).await?;

    let trace_layer = TraceLayer::new_for_http()
        .make_span_with(trace::DefaultMakeSpan::new().level(Level::INFO))
        .on_response(trace::DefaultOnResponse::new().level(Level::INFO));

    let cors = CorsLayer::new()
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::PATCH,
        ])
        .allow_headers([
            http::header::AUTHORIZATION,
            http::header::CONTENT_TYPE,
            http::header::CONTENT_LENGTH,
        ])
        .allow_origin(settings.cors_allowed_origins.clone());

    let notifier = Notifier::new(api::notification::push::sender(&settings.push)?);
    let sms = SmsGateway::new(&settings.sms);

    let app = app(pool.clone(), settings.config.clone(), notifier, sms)
        .layer(trace_layer)
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], settings.port));
    let listener = TcpListener::bind(addr)
        .await
        .map_err(AppError::unexpected)?;
    info!("Listening on {}", addr);

    let server = axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signals());

    select! {
        served = server => served.map_err(AppError::unexpected)?,
        _ = shutdown_deadline() => warn!("Open connections did not close in time, stopping anyway"),
    }

    pool.close().await;
    info!("Stopped");
    Ok(())
}

/// Dit au démarrage ce qui ne doit pas tourner en production.
fn announce(settings: &Settings) {
    match &settings.sms {
        SmsProvider::Log => warn!(
            "SMS_PROVIDER=log: login codes are written to the logs, no SMS is sent. Development only."
        ),
        SmsProvider::Brevo { .. } => info!("SMS provider: brevo"),
    }
    if let Some(account) = &settings.config.test_account {
        warn!(
            "TEST ACCOUNT ENABLED (AUTH_TEST_ACCOUNT_ENABLED=true): {} logs in with a fixed code and is created as administrator. Never enable this in production.",
            account.phone
        );
    }
    match &settings.push {
        PushProvider::Log => info!("Push provider: log (notifications are not sent)"),
        PushProvider::WebPush { .. } => info!("Push provider: webpush"),
    }
    if settings.config.osrm_url.is_empty() {
        info!("OSRM_URL is empty: routes are straight lines between stops");
    }
}

async fn is_healthy() -> bool {
    let port = var("PORT").unwrap_or_else(|_| "5000".to_string());
    reqwest::Client::new()
        .get(format!("http://127.0.0.1:{port}/api/health"))
        .timeout(Duration::from_secs(3))
        .send()
        .await
        .is_ok_and(|response| response.status().is_success())
}

async fn shutdown_signals() {
    let mut sigint = signal(SignalKind::interrupt()).expect("signal handling failed");
    let mut sigterm = signal(SignalKind::terminate()).expect("signal handling failed");
    select! {
        _ = sigint.recv() => (),
        _ = sigterm.recv() => ()
    }
    info!("Shutdown requested, waiting for requests in progress");
}

async fn shutdown_deadline() {
    shutdown_signals().await;
    tokio::time::sleep(SHUTDOWN_GRACE).await;
}
