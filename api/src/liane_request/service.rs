use std::collections::{HashMap, HashSet};

use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::liane_request::model::{LianeRequest, LianeRequestInput, LianeRequestRow};
use crate::rallying_point;
use crate::rallying_point::model::RallyingPoint;

const MAX_NAME_LENGTH: usize = 255;

pub async fn list(db: &PgPool, user_id: &Uuid) -> Result<Vec<LianeRequest>> {
    let rows = sqlx::query_as::<_, LianeRequestRow>(
        r#"
            SELECT
                id,
                name,
                waypoints,
                round_trip,
                arrive_before,
                return_after,
                can_drive,
                week_days,
                is_enabled,
                created_at
            FROM liane_request
            WHERE user_id = $1
            ORDER BY created_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(db)
    .await?;

    let waypoint_ids: Vec<Uuid> = rows
        .iter()
        .flat_map(|row| row.waypoints.iter().copied())
        .collect();
    let points = rallying_point::service::find_by_ids(db, &waypoint_ids).await?;

    Ok(rows
        .into_iter()
        .map(|row| with_waypoints(row, &points))
        .collect())
}

pub async fn find(db: &PgPool, user_id: &Uuid, id: &Uuid) -> Result<Option<LianeRequest>> {
    let row = sqlx::query_as::<_, LianeRequestRow>(
        r#"
            SELECT
                id,
                name,
                waypoints,
                round_trip,
                arrive_before,
                return_after,
                can_drive,
                week_days,
                is_enabled,
                created_at
            FROM liane_request
            WHERE id = $1
              AND user_id = $2
        "#,
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(db)
    .await?;

    with_fetched_waypoints(db, row).await
}

pub async fn create(
    db: &PgPool,
    user_id: &Uuid,
    input: &LianeRequestInput,
) -> Result<LianeRequest> {
    let name = validated_name(input)?;
    let points = validated_points(db, &input.waypoints).await?;

    let row = sqlx::query_as::<_, LianeRequestRow>(
        r#"
            INSERT INTO liane_request (
                user_id,
                name,
                waypoints,
                round_trip,
                arrive_before,
                return_after,
                can_drive,
                week_days,
                is_enabled
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING
                id,
                name,
                waypoints,
                round_trip,
                arrive_before,
                return_after,
                can_drive,
                week_days,
                is_enabled,
                created_at
        "#,
    )
    .bind(user_id)
    .bind(name)
    .bind(&input.waypoints)
    .bind(input.round_trip)
    .bind(input.arrive_before)
    .bind(input.return_after)
    .bind(input.can_drive)
    .bind(&input.week_days)
    .bind(input.is_enabled)
    .fetch_one(db)
    .await?;

    Ok(with_waypoints(row, &points))
}

pub async fn update(
    db: &PgPool,
    user_id: &Uuid,
    id: &Uuid,
    input: &LianeRequestInput,
) -> Result<Option<LianeRequest>> {
    let name = validated_name(input)?;
    let points = validated_points(db, &input.waypoints).await?;

    let row = sqlx::query_as::<_, LianeRequestRow>(
        r#"
            UPDATE liane_request
            SET name = $3,
                waypoints = $4,
                round_trip = $5,
                arrive_before = $6,
                return_after = $7,
                can_drive = $8,
                week_days = $9,
                is_enabled = $10
            WHERE id = $1
              AND user_id = $2
            RETURNING
                id,
                name,
                waypoints,
                round_trip,
                arrive_before,
                return_after,
                can_drive,
                week_days,
                is_enabled,
                created_at
        "#,
    )
    .bind(id)
    .bind(user_id)
    .bind(name)
    .bind(&input.waypoints)
    .bind(input.round_trip)
    .bind(input.arrive_before)
    .bind(input.return_after)
    .bind(input.can_drive)
    .bind(&input.week_days)
    .bind(input.is_enabled)
    .fetch_optional(db)
    .await?;

    Ok(row.map(|row| with_waypoints(row, &points)))
}

pub async fn delete(db: &PgPool, user_id: &Uuid, id: &Uuid) -> Result<bool> {
    let is_used_by_liane: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM liane_member WHERE liane_request_id = $1 AND user_id = $2)",
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(db)
    .await?;

    if is_used_by_liane {
        return Err(AppError::Conflict(
            "Liane request is used by a liane".to_string(),
        ));
    }

    let deleted = sqlx::query("DELETE FROM liane_request WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user_id)
        .execute(db)
        .await?;

    Ok(deleted.rows_affected() > 0)
}

fn validated_name(input: &LianeRequestInput) -> Result<&str> {
    let name = input.name.trim();
    if name.chars().count() > MAX_NAME_LENGTH {
        return Err(AppError::BadRequest);
    }
    Ok(name)
}

async fn validated_points(
    db: &PgPool,
    waypoint_ids: &[Uuid],
) -> Result<HashMap<Uuid, RallyingPoint>> {
    let distinct_ids: HashSet<&Uuid> = waypoint_ids.iter().collect();
    if waypoint_ids.len() < 2 || distinct_ids.len() != waypoint_ids.len() {
        return Err(AppError::BadRequest);
    }

    let points = rallying_point::service::find_by_ids(db, waypoint_ids).await?;
    let all_usable = waypoint_ids
        .iter()
        .all(|id| points.get(id).is_some_and(|point| point.is_active));
    if !all_usable {
        return Err(AppError::BadRequest);
    }

    Ok(points)
}

async fn with_fetched_waypoints(
    db: &PgPool,
    row: Option<LianeRequestRow>,
) -> Result<Option<LianeRequest>> {
    let Some(row) = row else {
        return Ok(None);
    };
    let points = rallying_point::service::find_by_ids(db, &row.waypoints).await?;
    Ok(Some(with_waypoints(row, &points)))
}

fn with_waypoints(row: LianeRequestRow, points: &HashMap<Uuid, RallyingPoint>) -> LianeRequest {
    let waypoints = row
        .waypoints
        .iter()
        .filter_map(|id| points.get(id).cloned())
        .collect();

    LianeRequest {
        id: row.id,
        name: row.name,
        waypoints,
        round_trip: row.round_trip,
        arrive_before: row.arrive_before,
        return_after: row.return_after,
        can_drive: row.can_drive,
        week_days: row.week_days,
        is_enabled: row.is_enabled,
        created_at: row.created_at,
    }
}
