use api::db::init_db;
use api::error::{AppError, Result, handle_error};
use api::router::api_router;
use axum::http::{HeaderValue, Method};
use axum::{Extension, Router, http};
use clap::Parser;
use dotenvy::dotenv;
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tokio::select;
use tokio::signal::unix::{SignalKind, signal};
use tower_http::cors::CorsLayer;
use tower_http::trace;
use tower_http::trace::TraceLayer;
use tracing::Level;

use api::config::Config;

#[derive(Parser)]
struct Args {
    #[arg(short, long)]
    debug: bool,
}

#[tokio::main]
async fn main() {
    let args = Args::parse();
    configure_logger(args.debug);

    handle_error(try_main).await;
}

fn configure_logger(debug: bool) {
    let level = if debug { Level::DEBUG } else { Level::INFO };

    #[cfg(debug_assertions)]
    tracing_subscriber::fmt()
        .with_target(false)
        .with_max_level(level)
        .compact()
        .init();

    #[cfg(not(debug_assertions))]
    tracing_subscriber::fmt()
        .json()
        .with_max_level(level)
        .with_current_span(false)
        .init();
}

async fn try_main() -> Result<()> {
    dotenv().ok();

    let config = Config::load();
    let pool = init_db().await?;

    let trace_layer = TraceLayer::new_for_http()
        .make_span_with(trace::DefaultMakeSpan::new().level(Level::INFO))
        .on_response(trace::DefaultOnResponse::new().level(Level::INFO));

    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::PATCH])
        .allow_headers([
            http::header::AUTHORIZATION,
            http::header::CONTENT_TYPE,
            http::header::CONTENT_LENGTH,
        ])
        .allow_origin(HeaderValue::from_static("http://localhost:3000"));

    let app = Router::new()
        .merge(api_router())
        .layer(trace_layer)
        .layer(cors)
        .layer(Extension(pool))
        .layer(Extension(config));

    let addr = SocketAddr::from(([0, 0, 0, 0], 5000));
    tracing::info!("Listening on {}", addr);

    let listener = TcpListener::bind(addr)
        .await
        .map_err(AppError::unexpected)?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signals())
        .await
        .map_err(AppError::unexpected)?;

    Ok(())
}

async fn shutdown_signals() {
    let mut sigint = signal(SignalKind::interrupt()).expect("signal handling failed");
    let mut sigterm = signal(SignalKind::terminate()).expect("signal handling failed");
    select! {
        _ = sigint.recv() => (),
        _ = sigterm.recv() => ()
    }
}
