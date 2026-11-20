use axum::extract::{Path, Query};
use axum::{Extension, Json};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::extractor::{AdminUser, OptionalUser};
use crate::auth::model::AuthUser;
use crate::config::Config;
use crate::error::{AppError, Result};
use crate::liane::model::{
    Liane, LianeDetail, LianeInput, LianeRequestMatches, LianeSearchResult, Membership,
    MembershipInput, MyLiane, NearQuery, Report, ReportInput, RoutePreview, RoutePreviewInput,
    RouteRecomputeReport, SearchQuery,
};
use crate::liane::{matching, report, service};
use crate::notification::Notifier;
use crate::trip;

pub async fn list(Extension(db): Extension<PgPool>) -> Result<Json<Vec<Liane>>> {
    let lianes = service::list_active(&db).await?;
    Ok(Json(lianes))
}

pub async fn search(
    Extension(db): Extension<PgPool>,
    Query(query): Query<SearchQuery>,
) -> Result<Json<Vec<LianeSearchResult>>> {
    let results = service::search(&db, &query).await?;
    Ok(Json(results))
}

pub async fn near(
    Extension(db): Extension<PgPool>,
    Query(query): Query<NearQuery>,
) -> Result<Json<Vec<Liane>>> {
    let lianes = service::find_near(&db, query.lat, query.lng, query.radius).await?;
    Ok(Json(lianes))
}

pub async fn get_one(
    OptionalUser(viewer): OptionalUser,
    Extension(db): Extension<PgPool>,
    Path(slug): Path<String>,
) -> Result<Json<LianeDetail>> {
    let liane = service::find_detail(&db, &slug, viewer.as_ref())
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(liane))
}

pub async fn list_mine(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
) -> Result<Json<Vec<MyLiane>>> {
    let lianes = service::list_mine(&db, &auth.id).await?;
    Ok(Json(lianes))
}

pub async fn find_matches(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path(liane_request_id): Path<Uuid>,
) -> Result<Json<LianeRequestMatches>> {
    let matches = matching::find_matches(&db, &auth.id, &liane_request_id).await?;
    Ok(Json(matches))
}

pub async fn list_all(
    _admin: AdminUser,
    Extension(db): Extension<PgPool>,
) -> Result<Json<Vec<Liane>>> {
    let lianes = service::list_all(&db).await?;
    Ok(Json(lianes))
}

pub async fn create(
    AdminUser(admin): AdminUser,
    Extension(db): Extension<PgPool>,
    Extension(config): Extension<Config>,
    Json(input): Json<LianeInput>,
) -> Result<Json<Liane>> {
    let liane = service::create(&db, &config.osrm_url, &admin.id, &input).await?;
    Ok(Json(liane))
}

pub async fn update(
    _admin: AdminUser,
    Extension(db): Extension<PgPool>,
    Extension(config): Extension<Config>,
    Path(id): Path<Uuid>,
    Json(input): Json<LianeInput>,
) -> Result<Json<Liane>> {
    let liane = service::update(&db, &config.osrm_url, &id, &input)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(liane))
}

pub async fn preview_route(
    _admin: AdminUser,
    Extension(db): Extension<PgPool>,
    Extension(config): Extension<Config>,
    Json(input): Json<RoutePreviewInput>,
) -> Result<Json<RoutePreview>> {
    let preview = service::preview_route(&db, &config.osrm_url, &input.stop_ids).await?;
    Ok(Json(preview))
}

pub async fn recompute_route(
    _admin: AdminUser,
    Extension(db): Extension<PgPool>,
    Extension(config): Extension<Config>,
    Path(id): Path<Uuid>,
) -> Result<Json<Liane>> {
    let liane = service::recompute_route(&db, &config.osrm_url, &id)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(liane))
}

pub async fn recompute_straight_routes(
    _admin: AdminUser,
    Extension(db): Extension<PgPool>,
    Extension(config): Extension<Config>,
) -> Result<Json<RouteRecomputeReport>> {
    let report = service::recompute_straight_routes(&db, &config.osrm_url).await?;
    Ok(Json(report))
}

pub async fn remove(
    _admin: AdminUser,
    Extension(db): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<()> {
    found(service::delete(&db, &id).await?)
}

pub async fn join(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Extension(notifier): Extension<Notifier>,
    Path(id): Path<Uuid>,
    Json(input): Json<MembershipInput>,
) -> Result<Json<Membership>> {
    let membership = service::join(&db, &auth.id, &id, &input).await?;
    service::announce_membership(
        &db,
        &notifier,
        &id,
        &auth.id,
        service::MembershipChange::Joined,
    )
    .await?;
    Ok(Json(membership))
}

pub async fn update_membership(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path(id): Path<Uuid>,
    Json(input): Json<MembershipInput>,
) -> Result<Json<Membership>> {
    let membership = service::update_membership(&db, &auth.id, &id, &input)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(membership))
}

pub async fn leave(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Extension(notifier): Extension<Notifier>,
    Path(id): Path<Uuid>,
) -> Result<()> {
    found(service::remove_member(&db, &id, &auth.id).await?)?;
    trip::service::withdraw_member(&db, &notifier, &id, &auth.id).await?;
    service::announce_membership(
        &db,
        &notifier,
        &id,
        &auth.id,
        service::MembershipChange::Left,
    )
    .await
}

pub async fn exclude_member(
    _admin: AdminUser,
    Extension(db): Extension<PgPool>,
    Extension(notifier): Extension<Notifier>,
    Path((id, user_id)): Path<(Uuid, Uuid)>,
) -> Result<()> {
    found(service::remove_member(&db, &id, &user_id).await?)?;
    trip::service::withdraw_member(&db, &notifier, &id, &user_id).await
}

pub async fn report_member(
    auth: AuthUser,
    Extension(db): Extension<PgPool>,
    Path((id, user_id)): Path<(Uuid, Uuid)>,
    Json(input): Json<ReportInput>,
) -> Result<()> {
    report::create(&db, &auth.id, &id, &user_id, &input.reason).await
}

pub async fn list_reports(
    _admin: AdminUser,
    Extension(db): Extension<PgPool>,
) -> Result<Json<Vec<Report>>> {
    let reports = report::list_open(&db).await?;
    Ok(Json(reports))
}

pub async fn exclude_reported(
    AdminUser(admin): AdminUser,
    Extension(db): Extension<PgPool>,
    Extension(notifier): Extension<Notifier>,
    Path(report_id): Path<Uuid>,
) -> Result<()> {
    let (liane_id, user_id) = report::exclude(&db, &admin.id, &report_id)
        .await?
        .ok_or(AppError::NotFound)?;
    trip::service::withdraw_member(&db, &notifier, &liane_id, &user_id).await
}

pub async fn dismiss_report(
    AdminUser(admin): AdminUser,
    Extension(db): Extension<PgPool>,
    Path(report_id): Path<Uuid>,
) -> Result<()> {
    found(report::dismiss(&db, &admin.id, &report_id).await?)
}

fn found(is_found: bool) -> Result<()> {
    if is_found {
        Ok(())
    } else {
        Err(AppError::NotFound)
    }
}
