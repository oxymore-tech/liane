use std::collections::{HashMap, HashSet};

use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::auth::model::AuthUser;
use crate::error::{AppError, Result};
use crate::liane::model::{
    DaySchedule, Direction, Liane, LianeDetail, LianeInput, LianeMember, LianeRow,
    LianeSearchResult, LianeStopRow, Membership, MembershipInput, MyLiane, MyMembershipRow,
    RoutePreview, RouteRecomputeReport, SearchQuery, SearchRow,
};
use crate::liane::routing::{self, ComputedRoute, OsrmFailure, Position};
use crate::liane::slug::unique_slug;
use crate::message;
use crate::message::model::MessageContent;
use crate::notification::Notifier;
use crate::rallying_point;
use crate::rallying_point::model::RallyingPoint;

const MAX_NAME_LENGTH: usize = 255;
const DEFAULT_SEARCH_RADIUS_METERS: f64 = 5_000.0;
const MAX_SEARCH_RADIUS_METERS: f64 = 30_000.0;
const DEFAULT_NEAR_RADIUS_METERS: f64 = 50.0;
const MAX_NEAR_RADIUS_METERS: f64 = 5_000.0;
/// Le tracé routier est stocké entier ; l'API le sert allégé (écart d'environ 5 m au plus),
/// ce qui divise son poids par quatre sans différence visible sur une carte.
const SERVED_ROUTE_TOLERANCE_DEGREES: f64 = 0.00005;
const FOREIGN_KEY_VIOLATION: &str = "23503";

pub async fn list_active(db: &PgPool) -> Result<Vec<Liane>> {
    let ids: Vec<Uuid> = sqlx::query_scalar("SELECT id FROM liane WHERE is_active")
        .fetch_all(db)
        .await?;
    find_by_ids(db, &ids).await
}

pub async fn list_all(db: &PgPool) -> Result<Vec<Liane>> {
    let ids: Vec<Uuid> = sqlx::query_scalar("SELECT id FROM liane")
        .fetch_all(db)
        .await?;
    find_by_ids(db, &ids).await
}

pub async fn list_mine(db: &PgPool, user_id: &Uuid) -> Result<Vec<MyLiane>> {
    let rows = sqlx::query_as::<_, MyMembershipRow>(
        r#"
            SELECT
                liane_id,
                board_rp_id AS board_stop_id,
                alight_rp_id AS alight_stop_id,
                week_days,
                direction,
                can_drive,
                outbound_time,
                return_time,
                joined_at
            FROM liane_member
            WHERE user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_all(db)
    .await?;

    let ids: Vec<Uuid> = rows.iter().map(|row| row.liane_id).collect();
    let unread_counts = message::service::unread_counts(db, user_id).await?;
    let mut memberships: HashMap<Uuid, Membership> = rows
        .into_iter()
        .map(|row| (row.liane_id, row.membership))
        .collect();

    Ok(find_by_ids(db, &ids)
        .await?
        .into_iter()
        .filter_map(|liane| {
            let membership = memberships.remove(&liane.id)?;
            let unread_count = unread_counts.get(&liane.id).copied().unwrap_or(0);
            Some(MyLiane {
                liane,
                membership,
                unread_count,
            })
        })
        .collect())
}

pub async fn search(db: &PgPool, query: &SearchQuery) -> Result<Vec<LianeSearchResult>> {
    let radius = query
        .radius
        .unwrap_or(DEFAULT_SEARCH_RADIUS_METERS)
        .clamp(0.0, MAX_SEARCH_RADIUS_METERS);

    let rows = sqlx::query_as::<_, SearchRow>(
        r#"
            WITH search AS (
                SELECT
                    ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography AS origin,
                    ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography AS destination
            )
            SELECT
                l.id AS liane_id,
                nearest_from.rallying_point_id AS from_stop_id,
                nearest_to.rallying_point_id AS to_stop_id,
                nearest_from.ordinal AS from_ordinal,
                nearest_to.ordinal AS to_ordinal,
                nearest_from.distance AS from_distance_meters,
                nearest_to.distance AS to_distance_meters
            FROM liane l
            CROSS JOIN search
            CROSS JOIN LATERAL (
                SELECT s.rallying_point_id, s.ordinal, ST_Distance(rp.location, search.origin) AS distance
                FROM liane_stop s
                INNER JOIN rallying_point rp ON rp.id = s.rallying_point_id
                WHERE s.liane_id = l.id
                ORDER BY distance
                LIMIT 1
            ) nearest_from
            CROSS JOIN LATERAL (
                SELECT s.rallying_point_id, s.ordinal, ST_Distance(rp.location, search.destination) AS distance
                FROM liane_stop s
                INNER JOIN rallying_point rp ON rp.id = s.rallying_point_id
                WHERE s.liane_id = l.id
                ORDER BY distance
                LIMIT 1
            ) nearest_to
            WHERE l.is_active
              AND nearest_from.distance <= $5
              AND nearest_to.distance <= $5
              AND nearest_from.ordinal <> nearest_to.ordinal
            ORDER BY nearest_from.distance + nearest_to.distance
        "#,
    )
    .bind(query.from_lat)
    .bind(query.from_lng)
    .bind(query.to_lat)
    .bind(query.to_lng)
    .bind(radius)
    .fetch_all(db)
    .await?;

    let ids: Vec<Uuid> = rows.iter().map(|row| row.liane_id).collect();
    let mut lianes: HashMap<Uuid, Liane> = find_by_ids(db, &ids)
        .await?
        .into_iter()
        .map(|liane| (liane.id, liane))
        .collect();

    Ok(rows
        .into_iter()
        .filter_map(|row| {
            let liane = lianes.remove(&row.liane_id)?;
            let direction = if row.from_ordinal < row.to_ordinal {
                Direction::Outbound
            } else {
                Direction::Return
            };
            let section_distance_meters =
                section_distance(&liane, &row.from_stop_id, &row.to_stop_id);
            Some(LianeSearchResult {
                section_distance_meters,
                liane,
                from_stop_id: row.from_stop_id,
                to_stop_id: row.to_stop_id,
                direction,
                from_distance_meters: row.from_distance_meters,
                to_distance_meters: row.to_distance_meters,
            })
        })
        .collect())
}

/// Les lianes actives dont le tracé passe à moins de `radius` mètres du point, de la plus proche à la plus
/// lointaine : ce qu'on a touché sur la carte, là où plusieurs lianes partagent la même route.
pub async fn find_near(db: &PgPool, lat: f64, lng: f64, radius: Option<f64>) -> Result<Vec<Liane>> {
    let radius = radius
        .unwrap_or(DEFAULT_NEAR_RADIUS_METERS)
        .clamp(1.0, MAX_NEAR_RADIUS_METERS);
    let ids: Vec<Uuid> = sqlx::query_scalar(
        r#"
            SELECT l.id
            FROM liane l
            CROSS JOIN (SELECT ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography AS touched) search
            WHERE l.is_active
              AND ST_DWithin(l.route::geography, search.touched, $3)
            ORDER BY ST_Distance(l.route::geography, search.touched), l.name
        "#,
    )
    .bind(lat)
    .bind(lng)
    .bind(radius)
    .fetch_all(db)
    .await?;

    let mut lianes: HashMap<Uuid, Liane> = find_by_ids(db, &ids)
        .await?
        .into_iter()
        .map(|liane| (liane.id, liane))
        .collect();
    Ok(ids.iter().filter_map(|id| lianes.remove(id)).collect())
}

fn section_distance(liane: &Liane, from_stop_id: &Uuid, to_stop_id: &Uuid) -> i32 {
    let distance_of = |stop_id: &Uuid| {
        liane
            .stops
            .iter()
            .position(|stop| &stop.id == stop_id)
            .and_then(|index| liane.stop_distances.get(index))
            .copied()
            .unwrap_or(0)
    };
    (distance_of(to_stop_id) - distance_of(from_stop_id)).abs()
}

pub async fn find_detail(
    db: &PgPool,
    slug: &str,
    viewer: Option<&AuthUser>,
) -> Result<Option<LianeDetail>> {
    let id: Option<Uuid> = sqlx::query_scalar("SELECT id FROM liane WHERE slug = $1")
        .bind(slug)
        .fetch_optional(db)
        .await?;
    let Some(id) = id else {
        return Ok(None);
    };
    let Some(liane) = find_by_ids(db, &[id]).await?.into_iter().next() else {
        return Ok(None);
    };

    let membership = match viewer {
        Some(viewer) => find_membership(db, &id, &viewer.id).await?,
        None => None,
    };
    let is_admin = viewer.is_some_and(|viewer| viewer.is_admin);

    if !liane.is_active && !is_admin && membership.is_none() {
        return Ok(None);
    }

    let members = if is_admin || membership.is_some() {
        Some(find_members(db, &id).await?)
    } else {
        None
    };

    Ok(Some(LianeDetail {
        liane,
        schedule: find_schedule(db, &id).await?,
        membership,
        members,
    }))
}

pub async fn find_by_ids(db: &PgPool, ids: &[Uuid]) -> Result<Vec<Liane>> {
    let rows = sqlx::query_as::<_, LianeRow>(
        r#"
            SELECT
                l.id,
                l.name,
                l.slug,
                l.is_active,
                ST_AsGeoJSON(
                    CASE
                        WHEN l.route_source = 'Osrm' THEN ST_Simplify(l.route, $2)
                        ELSE l.route
                    END,
                    5
                ) AS route,
                l.route_source,
                l.distance_meters,
                l.duration_seconds,
                (SELECT COUNT(*) FROM liane_member lm WHERE lm.liane_id = l.id) AS member_count,
                l.created_at,
                l.updated_at
            FROM liane l
            WHERE l.id = ANY($1)
            ORDER BY l.name, l.id
        "#,
    )
    .bind(ids)
    .bind(SERVED_ROUTE_TOLERANCE_DEGREES)
    .fetch_all(db)
    .await?;

    let stop_rows = sqlx::query_as::<_, LianeStopRow>(
        r#"
            SELECT
                s.liane_id,
                s.distance_meters,
                rp.id,
                rp.label,
                ST_Y(rp.location::geometry) AS lat,
                ST_X(rp.location::geometry) AS lng,
                rp.kind,
                rp.address,
                rp.zip_code,
                rp.city,
                rp.place_count,
                rp.is_active
            FROM liane_stop s
            INNER JOIN rallying_point rp ON rp.id = s.rallying_point_id
            WHERE s.liane_id = ANY($1)
            ORDER BY s.liane_id, s.ordinal
        "#,
    )
    .bind(ids)
    .fetch_all(db)
    .await?;

    let mut stops_by_liane: HashMap<Uuid, (Vec<RallyingPoint>, Vec<i32>)> = HashMap::new();
    for row in stop_rows {
        let (stops, distances) = stops_by_liane.entry(row.liane_id).or_default();
        stops.push(row.point);
        distances.push(row.distance_meters);
    }

    rows.into_iter()
        .map(|row| {
            let (stops, stop_distances) = stops_by_liane.remove(&row.id).unwrap_or_default();
            Ok(Liane {
                id: row.id,
                name: row.name,
                slug: row.slug,
                is_active: row.is_active,
                stops,
                stop_distances,
                route: row.route.as_deref().map(serde_json::from_str).transpose()?,
                route_source: row.route_source,
                distance_meters: row.distance_meters,
                duration_seconds: row.duration_seconds,
                member_count: row.member_count,
                created_at: row.created_at,
                updated_at: row.updated_at,
            })
        })
        .collect()
}

/// Le tracé est calculé avant d'ouvrir la transaction : l'attente d'OSRM ne retient aucun verrou.
pub async fn create(
    db: &PgPool,
    osrm_url: &str,
    admin_id: &Uuid,
    input: &LianeInput,
) -> Result<Liane> {
    let name = validated_name(input)?;
    let positions = validated_stop_positions(db, &input.stop_ids, &[]).await?;
    let route = routing::compute(osrm_url, &positions).await;

    let mut tx = db.begin().await?;
    let slug = unique_slug(&mut tx, name).await?;

    let id: Uuid = sqlx::query_scalar(
        r#"
            INSERT INTO liane (name, slug, is_active, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        "#,
    )
    .bind(name)
    .bind(&slug)
    .bind(input.is_active)
    .bind(admin_id)
    .fetch_one(&mut *tx)
    .await?;

    replace_stops(&mut tx, &id, &input.stop_ids, &route).await?;
    tx.commit().await?;

    find_one(db, &id).await
}

/// Le slug ne change pas quand le nom change : les adresses déjà partagées restent valables.
/// Le tracé n'est recalculé que si les arrêts changent.
pub async fn update(
    db: &PgPool,
    osrm_url: &str,
    id: &Uuid,
    input: &LianeInput,
) -> Result<Option<Liane>> {
    let name = validated_name(input)?;
    let current_stop_ids = find_stop_ids(db, id).await?;
    let positions = validated_stop_positions(db, &input.stop_ids, &current_stop_ids).await?;
    let new_route = if current_stop_ids == input.stop_ids {
        None
    } else {
        Some(routing::compute(osrm_url, &positions).await)
    };

    let mut tx = db.begin().await?;

    let updated = sqlx::query(
        r#"
            UPDATE liane
            SET name = $2,
                is_active = $3,
                updated_at = NOW()
            WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(name)
    .bind(input.is_active)
    .execute(&mut *tx)
    .await?;
    if updated.rows_affected() == 0 {
        return Ok(None);
    }

    if let Some(route) = new_route {
        sqlx::query(
            "SET CONSTRAINTS liane_member_board_stop_fkey, liane_member_alight_stop_fkey DEFERRED",
        )
        .execute(&mut *tx)
        .await?;
        replace_stops(&mut tx, id, &input.stop_ids, &route).await?;
        ensure_memberships_still_valid(&mut tx, id).await?;
    }

    tx.commit().await?;

    find_one(db, id).await.map(Some)
}

pub async fn preview_route(db: &PgPool, osrm_url: &str, stop_ids: &[Uuid]) -> Result<RoutePreview> {
    let positions = validated_stop_positions(db, stop_ids, stop_ids).await?;
    let route = routing::compute(osrm_url, &positions).await;
    Ok(RoutePreview {
        route: route.geojson(),
        route_source: route.source,
        distance_meters: route.distance_meters,
        duration_seconds: route.duration_seconds,
        stop_distances: route.stop_distances,
    })
}

/// Recalcule le tracé d'une liane ; si OSRM ne répond toujours pas, elle repasse en ligne droite.
pub async fn recompute_route(db: &PgPool, osrm_url: &str, id: &Uuid) -> Result<Option<Liane>> {
    let stop_ids = find_stop_ids(db, id).await?;
    if stop_ids.is_empty() {
        return Ok(None);
    }
    let positions = stop_positions(db, &stop_ids).await?;
    let route = routing::compute(osrm_url, &positions).await;
    store_route_if_stops_unchanged(db, id, &stop_ids, &route).await?;
    find_one(db, id).await.map(Some)
}

/// Recalcule les tracés restés en ligne droite. S'arrête dès qu'OSRM est injoignable ;
/// une liane qu'OSRM ne sait pas relier (hors de la zone couverte) reste en ligne droite.
pub async fn recompute_straight_routes(
    db: &PgPool,
    osrm_url: &str,
) -> Result<RouteRecomputeReport> {
    let ids: Vec<Uuid> =
        sqlx::query_scalar("SELECT id FROM liane WHERE route_source = 'Straight' ORDER BY id")
            .fetch_all(db)
            .await?;

    let mut recomputed = 0;
    for id in &ids {
        let stop_ids = find_stop_ids(db, id).await?;
        let positions = stop_positions(db, &stop_ids).await?;
        match routing::osrm_route(osrm_url, &positions).await {
            Ok(route) => {
                if store_route_if_stops_unchanged(db, id, &stop_ids, &route).await? {
                    recomputed += 1;
                }
            }
            Err(OsrmFailure::NoRoute(_)) => {}
            Err(OsrmFailure::Unavailable(reason)) => {
                tracing::warn!("OSRM unavailable, route recomputation stopped: {reason}");
                break;
            }
        }
    }
    Ok(RouteRecomputeReport {
        recomputed,
        still_straight: ids.len() - recomputed,
    })
}

pub async fn delete(db: &PgPool, id: &Uuid) -> Result<bool> {
    let deleted = sqlx::query("DELETE FROM liane WHERE id = $1")
        .bind(id)
        .execute(db)
        .await;

    match deleted {
        Ok(deleted) => Ok(deleted.rows_affected() > 0),
        Err(err) if is_foreign_key_violation(&err) => Err(AppError::Conflict(
            "Liane has trips and cannot be deleted; deactivate it instead".to_string(),
        )),
        Err(err) => Err(err.into()),
    }
}

pub async fn join(
    db: &PgPool,
    user_id: &Uuid,
    id: &Uuid,
    input: &MembershipInput,
) -> Result<Membership> {
    let is_active: Option<bool> = sqlx::query_scalar("SELECT is_active FROM liane WHERE id = $1")
        .bind(id)
        .fetch_optional(db)
        .await?;
    if is_active != Some(true) {
        return Err(AppError::NotFound);
    }

    validate_membership(db, id, input).await?;

    let inserted = sqlx::query(
        r#"
            INSERT INTO liane_member (
                liane_id,
                user_id,
                board_rp_id,
                alight_rp_id,
                week_days,
                direction,
                can_drive,
                outbound_time,
                return_time
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (liane_id, user_id) DO NOTHING
        "#,
    )
    .bind(id)
    .bind(user_id)
    .bind(input.board_stop_id)
    .bind(input.alight_stop_id)
    .bind(&input.week_days)
    .bind(input.direction)
    .bind(input.can_drive)
    .bind(input.outbound_time)
    .bind(input.return_time)
    .execute(db)
    .await?;

    if inserted.rows_affected() == 0 {
        return Err(AppError::Conflict(
            "User is already a member of this liane".to_string(),
        ));
    }

    find_membership(db, id, user_id)
        .await?
        .ok_or(AppError::NotFound)
}

pub async fn update_membership(
    db: &PgPool,
    user_id: &Uuid,
    id: &Uuid,
    input: &MembershipInput,
) -> Result<Option<Membership>> {
    validate_membership(db, id, input).await?;

    sqlx::query(
        r#"
            UPDATE liane_member
            SET board_rp_id = $3,
                alight_rp_id = $4,
                week_days = $5,
                direction = $6,
                can_drive = $7,
                outbound_time = $8,
                return_time = $9
            WHERE liane_id = $1
              AND user_id = $2
        "#,
    )
    .bind(id)
    .bind(user_id)
    .bind(input.board_stop_id)
    .bind(input.alight_stop_id)
    .bind(&input.week_days)
    .bind(input.direction)
    .bind(input.can_drive)
    .bind(input.outbound_time)
    .bind(input.return_time)
    .execute(db)
    .await?;

    find_membership(db, id, user_id).await
}

pub async fn remove_member(db: &PgPool, id: &Uuid, user_id: &Uuid) -> Result<bool> {
    let removed = sqlx::query("DELETE FROM liane_member WHERE liane_id = $1 AND user_id = $2")
        .bind(id)
        .bind(user_id)
        .execute(db)
        .await?;
    Ok(removed.rows_affected() > 0)
}

pub async fn is_member(db: &PgPool, id: &Uuid, user_id: &Uuid) -> Result<bool> {
    let is_member = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM liane_member WHERE liane_id = $1 AND user_id = $2)",
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(db)
    .await?;
    Ok(is_member)
}

#[derive(Debug, sqlx::FromRow)]
pub struct LianeLabel {
    pub name: String,
    pub slug: String,
}

pub async fn find_label(db: &PgPool, id: &Uuid) -> Result<LianeLabel> {
    sqlx::query_as::<_, LianeLabel>("SELECT name, slug FROM liane WHERE id = $1")
        .bind(id)
        .fetch_optional(db)
        .await?
        .ok_or(AppError::NotFound)
}

pub async fn find_member_ids_except(db: &PgPool, id: &Uuid, user_id: &Uuid) -> Result<Vec<Uuid>> {
    let ids = sqlx::query_scalar(
        "SELECT user_id FROM liane_member WHERE liane_id = $1 AND user_id <> $2",
    )
    .bind(id)
    .bind(user_id)
    .fetch_all(db)
    .await?;
    Ok(ids)
}

/// Arrêts de montée et de descente d'un membre, dans le sens aller de la liane.
pub async fn find_member_stops(
    db: &PgPool,
    id: &Uuid,
    user_id: &Uuid,
) -> Result<Option<(Uuid, Uuid)>> {
    let stops = sqlx::query_as(
        "SELECT board_rp_id, alight_rp_id FROM liane_member WHERE liane_id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(db)
    .await?;
    Ok(stops)
}

#[derive(Debug, Clone, Copy)]
pub enum MembershipChange {
    Joined,
    Left,
}

/// « X a rejoint la liane » / « X a quitté la liane » dans le fil de la liane.
pub async fn announce_membership(
    db: &PgPool,
    notifier: &Notifier,
    id: &Uuid,
    user_id: &Uuid,
    change: MembershipChange,
) -> Result<()> {
    let pseudo: Option<String> = sqlx::query_scalar(r#"SELECT pseudo FROM "user" WHERE id = $1"#)
        .bind(user_id)
        .fetch_one(db)
        .await?;
    let who = pseudo.as_deref().unwrap_or("Un membre");
    let (content, text) = match change {
        MembershipChange::Joined => (
            MessageContent::MemberJoined,
            format!("{who} a rejoint la liane"),
        ),
        MembershipChange::Left => (
            MessageContent::MemberLeft,
            format!("{who} a quitté la liane"),
        ),
    };
    message::service::post_event(db, notifier, id, user_id, &content, &text).await?;
    Ok(())
}

async fn find_one(db: &PgPool, id: &Uuid) -> Result<Liane> {
    find_by_ids(db, &[*id])
        .await?
        .into_iter()
        .next()
        .ok_or(AppError::NotFound)
}

async fn find_membership(db: &PgPool, id: &Uuid, user_id: &Uuid) -> Result<Option<Membership>> {
    let membership = sqlx::query_as::<_, Membership>(
        r#"
            SELECT
                board_rp_id AS board_stop_id,
                alight_rp_id AS alight_stop_id,
                week_days,
                direction,
                can_drive,
                outbound_time,
                return_time,
                joined_at
            FROM liane_member
            WHERE liane_id = $1
              AND user_id = $2
        "#,
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(db)
    .await?;
    Ok(membership)
}

async fn find_members(db: &PgPool, id: &Uuid) -> Result<Vec<LianeMember>> {
    let members = sqlx::query_as::<_, LianeMember>(
        r#"
            SELECT
                u.id,
                u.pseudo,
                u.gender,
                u.picture_url,
                lm.board_rp_id AS board_stop_id,
                lm.alight_rp_id AS alight_stop_id,
                lm.week_days,
                lm.direction,
                lm.can_drive,
                lm.outbound_time,
                lm.return_time,
                lm.joined_at
            FROM liane_member lm
            INNER JOIN "user" u ON u.id = lm.user_id
            WHERE lm.liane_id = $1
            ORDER BY lm.joined_at
        "#,
    )
    .bind(id)
    .fetch_all(db)
    .await?;
    Ok(members)
}

async fn find_schedule(db: &PgPool, id: &Uuid) -> Result<Vec<DaySchedule>> {
    let schedule = sqlx::query_as::<_, DaySchedule>(
        r#"
            SELECT
                week.day - 1 AS day,
                COUNT(lm.user_id) FILTER (WHERE lm.direction IN ('Outbound', 'Both')) AS outbound_members,
                COUNT(lm.user_id) FILTER (WHERE lm.direction IN ('Outbound', 'Both') AND lm.can_drive) AS outbound_drivers,
                COUNT(lm.user_id) FILTER (WHERE lm.direction IN ('Return', 'Both')) AS return_members,
                COUNT(lm.user_id) FILTER (WHERE lm.direction IN ('Return', 'Both') AND lm.can_drive) AS return_drivers
            FROM generate_series(1, 7) AS week(day)
            LEFT JOIN liane_member lm ON
                lm.liane_id = $1
                AND substr(lm.week_days, week.day, 1) = '1'
            GROUP BY week.day
            ORDER BY week.day
        "#,
    )
    .bind(id)
    .fetch_all(db)
    .await?;
    Ok(schedule)
}

fn validated_name(input: &LianeInput) -> Result<&str> {
    let name = input.name.trim();
    if name.is_empty() || name.chars().count() > MAX_NAME_LENGTH {
        return Err(AppError::BadRequest);
    }
    Ok(name)
}

/// Un point désactivé (disparu de sa source) reste accepté s'il fait partie de `kept_ids`, les arrêts
/// actuels de la liane : on peut toujours la modifier.
async fn validated_stop_positions(
    db: &PgPool,
    stop_ids: &[Uuid],
    kept_ids: &[Uuid],
) -> Result<Vec<Position>> {
    let distinct_ids: HashSet<&Uuid> = stop_ids.iter().collect();
    if stop_ids.len() < 2 || distinct_ids.len() != stop_ids.len() {
        return Err(AppError::BadRequest);
    }

    let points = rallying_point::service::find_by_ids(db, stop_ids).await?;
    stop_ids
        .iter()
        .map(|id| match points.get(id) {
            Some(point) if point.is_active || kept_ids.contains(id) => Ok([point.lng, point.lat]),
            _ => Err(AppError::BadRequest),
        })
        .collect()
}

async fn stop_positions(db: &PgPool, stop_ids: &[Uuid]) -> Result<Vec<Position>> {
    let points = rallying_point::service::find_by_ids(db, stop_ids).await?;
    Ok(stop_ids
        .iter()
        .filter_map(|id| points.get(id).map(|point| [point.lng, point.lat]))
        .collect())
}

async fn find_stop_ids(db: &PgPool, id: &Uuid) -> Result<Vec<Uuid>> {
    let stop_ids = sqlx::query_scalar(
        "SELECT rallying_point_id FROM liane_stop WHERE liane_id = $1 ORDER BY ordinal",
    )
    .bind(id)
    .fetch_all(db)
    .await?;
    Ok(stop_ids)
}

async fn replace_stops(
    connection: &mut PgConnection,
    id: &Uuid,
    stop_ids: &[Uuid],
    route: &ComputedRoute,
) -> Result<()> {
    sqlx::query("DELETE FROM liane_stop WHERE liane_id = $1")
        .bind(id)
        .execute(&mut *connection)
        .await?;

    sqlx::query(
        r#"
            INSERT INTO liane_stop (liane_id, rallying_point_id, ordinal, distance_meters)
            SELECT $1, stop.id, stop.ordinal - 1, stop.distance_meters
            FROM unnest($2::uuid[], $3::integer[]) WITH ORDINALITY AS stop(id, distance_meters, ordinal)
        "#,
    )
    .bind(id)
    .bind(stop_ids)
    .bind(&route.stop_distances)
    .execute(&mut *connection)
    .await?;

    store_route(connection, id, route).await
}

async fn store_route(
    connection: &mut PgConnection,
    id: &Uuid,
    route: &ComputedRoute,
) -> Result<()> {
    sqlx::query(
        r#"
            UPDATE liane
            SET route = ST_SetSRID(ST_GeomFromGeoJSON($2), 4326),
                route_source = $3,
                distance_meters = $4,
                duration_seconds = $5,
                updated_at = NOW()
            WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(route.geojson().to_string())
    .bind(route.source)
    .bind(route.distance_meters)
    .bind(route.duration_seconds)
    .execute(connection)
    .await?;
    Ok(())
}

/// Le calcul du tracé a lieu hors transaction : si les arrêts ont changé entre-temps, il est abandonné.
async fn store_route_if_stops_unchanged(
    db: &PgPool,
    id: &Uuid,
    stop_ids: &[Uuid],
    route: &ComputedRoute,
) -> Result<bool> {
    let mut tx = db.begin().await?;

    let current_stop_ids: Vec<Uuid> = sqlx::query_scalar(
        r#"
            SELECT s.rallying_point_id
            FROM liane_stop s
            INNER JOIN liane l ON l.id = s.liane_id
            WHERE s.liane_id = $1
            ORDER BY s.ordinal
            FOR UPDATE OF l
        "#,
    )
    .bind(id)
    .fetch_all(&mut *tx)
    .await?;
    if current_stop_ids != stop_ids || route.stop_distances.len() != stop_ids.len() {
        return Ok(false);
    }

    sqlx::query(
        r#"
            UPDATE liane_stop s
            SET distance_meters = stop.distance_meters
            FROM unnest($2::integer[]) WITH ORDINALITY AS stop(distance_meters, ordinal)
            WHERE s.liane_id = $1
              AND s.ordinal = stop.ordinal - 1
        "#,
    )
    .bind(id)
    .bind(&route.stop_distances)
    .execute(&mut *tx)
    .await?;
    store_route(&mut tx, id, route).await?;

    tx.commit().await?;
    Ok(true)
}

async fn ensure_memberships_still_valid(connection: &mut PgConnection, id: &Uuid) -> Result<()> {
    let has_broken_membership: bool = sqlx::query_scalar(
        r#"
            SELECT EXISTS (
                SELECT 1
                FROM liane_member lm
                LEFT JOIN liane_stop board ON
                    board.liane_id = lm.liane_id AND board.rallying_point_id = lm.board_rp_id
                LEFT JOIN liane_stop alight ON
                    alight.liane_id = lm.liane_id AND alight.rallying_point_id = lm.alight_rp_id
                WHERE lm.liane_id = $1
                  AND (board.ordinal IS NULL OR alight.ordinal IS NULL OR board.ordinal >= alight.ordinal)
            )
        "#,
    )
    .bind(id)
    .fetch_one(connection)
    .await?;

    if has_broken_membership {
        return Err(AppError::Conflict(
            "Some members use a stop that would be removed or reordered".to_string(),
        ));
    }
    Ok(())
}

async fn validate_membership(db: &PgPool, id: &Uuid, input: &MembershipInput) -> Result<()> {
    if !input.week_days.has_any_day() {
        return Err(AppError::BadRequest);
    }

    let ordinals: Vec<(Uuid, i32)> = sqlx::query_as(
        r#"
            SELECT rallying_point_id, ordinal
            FROM liane_stop
            WHERE liane_id = $1
              AND rallying_point_id IN ($2, $3)
        "#,
    )
    .bind(id)
    .bind(input.board_stop_id)
    .bind(input.alight_stop_id)
    .fetch_all(db)
    .await?;

    let ordinal_of = |stop_id: &Uuid| {
        ordinals
            .iter()
            .find(|(id, _)| id == stop_id)
            .map(|(_, ordinal)| *ordinal)
    };

    match (
        ordinal_of(&input.board_stop_id),
        ordinal_of(&input.alight_stop_id),
    ) {
        (Some(board), Some(alight)) if board < alight => Ok(()),
        _ => Err(AppError::BadRequest),
    }
}

fn is_foreign_key_violation(err: &sqlx::Error) -> bool {
    err.as_database_error()
        .and_then(|db_err| db_err.code())
        .is_some_and(|code| code == FOREIGN_KEY_VIOLATION)
}
