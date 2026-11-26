use axum::extract::{Path, Query};
use axum::{Extension, Json};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::extractor::AdminUser;
use crate::auth::model::AuthUser;
use crate::config::Config;
use crate::error::Result;
use crate::notification::Notifier;
use crate::trip::model::{
    AdminTrip, BookingInput, ExportQuery, GestureInput, MyTrips, Trip, TripDetail, TripInput,
};
use crate::trip::proof::{self, ExportedJourney};
use crate::trip::service;

pub async fn create(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Extension(notifier): Extension<Notifier>,
    Path(liane_id): Path<Uuid>,
    Json(input): Json<TripInput>,
) -> Result<Json<TripDetail>> {
    let trip = service::create(&db, &notifier, &auth, &liane_id, &input).await?;
    Ok(Json(trip))
}

pub async fn list_of_liane(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path(liane_id): Path<Uuid>,
) -> Result<Json<Vec<Trip>>> {
    let trips = service::list_open_of_liane(&db, &liane_id, &auth).await?;
    Ok(Json(trips))
}

pub async fn list_mine(auth: AuthUser, Extension(db): Extension<PgPool>) -> Result<Json<MyTrips>> {
    let trips = service::list_mine(&db, &auth.id).await?;
    Ok(Json(trips))
}

pub async fn get_one(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<TripDetail>> {
    let trip = service::find_detail(&db, &id, &auth).await?;
    Ok(Json(trip))
}

pub async fn cancel(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Extension(notifier): Extension<Notifier>,
    Path(id): Path<Uuid>,
) -> Result<Json<TripDetail>> {
    let trip = service::cancel(&db, &notifier, &id, &auth).await?;
    Ok(Json(trip))
}

/// Le corps est facultatif : sans lui, le passager est inscrit sur son tronçon habituel.
pub async fn book(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Extension(notifier): Extension<Notifier>,
    Path(id): Path<Uuid>,
    input: Option<Json<BookingInput>>,
) -> Result<Json<TripDetail>> {
    let input = input.map(|Json(input)| input).unwrap_or_default();
    let trip = service::book(&db, &notifier, &id, &auth, &input).await?;
    Ok(Json(trip))
}

pub async fn unbook(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Extension(notifier): Extension<Notifier>,
    Path(id): Path<Uuid>,
) -> Result<Json<TripDetail>> {
    let trip = service::unbook(&db, &notifier, &id, &auth).await?;
    Ok(Json(trip))
}

pub async fn record_gesture(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Extension(notifier): Extension<Notifier>,
    Extension(config): Extension<Config>,
    Path(id): Path<Uuid>,
    Json(input): Json<GestureInput>,
) -> Result<Json<TripDetail>> {
    let trip = service::record_gesture(
        &db,
        &notifier,
        config.cost_share_cents_per_km,
        &id,
        &auth,
        &input,
    )
    .await?;
    Ok(Json(trip))
}

pub async fn list_for_admin(
    AdminUser(admin): AdminUser,
    Extension(db): Extension<PgPool>,
) -> Result<Json<Vec<AdminTrip>>> {
    let trips = service::list_for_admin(&db, &admin.id).await?;
    Ok(Json(trips))
}

pub async fn export(
    _admin: AdminUser,
    Extension(db): Extension<PgPool>,
    Query(query): Query<ExportQuery>,
) -> Result<Json<Vec<ExportedJourney>>> {
    let journeys = proof::export(&db, query.class).await?;
    Ok(Json(journeys))
}
