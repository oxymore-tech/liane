use std::collections::HashMap;

use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::liane::model::{CreateLiane, Liane, LianeMember, LianeMemberRow, LianeRow};
use crate::rallying_point;

pub async fn list(db: &PgPool, user_id: &Uuid) -> Result<Vec<Liane>> {
    let ids: Vec<Uuid> = sqlx::query_scalar("SELECT liane_id FROM liane_member WHERE user_id = $1")
        .bind(user_id)
        .fetch_all(db)
        .await?;

    find_by_ids(db, &ids).await
}

pub async fn find(db: &PgPool, user_id: &Uuid, id: &Uuid) -> Result<Option<Liane>> {
    let is_member: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM liane_member WHERE liane_id = $1 AND user_id = $2)",
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(db)
    .await?;

    if !is_member {
        return Ok(None);
    }

    let lianes = find_by_ids(db, &[*id]).await?;
    Ok(lianes.into_iter().next())
}

pub async fn find_by_ids(db: &PgPool, ids: &[Uuid]) -> Result<Vec<Liane>> {
    let rows = sqlx::query_as::<_, LianeRow>(
        r#"
            SELECT
                id,
                waypoints,
                round_trip,
                arrive_before,
                return_after,
                week_days,
                created_at
            FROM liane
            WHERE id = ANY($1)
            ORDER BY created_at DESC
        "#,
    )
    .bind(ids)
    .fetch_all(db)
    .await?;

    let member_rows = sqlx::query_as::<_, LianeMemberRow>(
        r#"
            SELECT
                lm.liane_id,
                u.id,
                u.pseudo,
                u.gender,
                u.picture_url,
                lm.liane_request_id,
                lm.joined_at,
                lm.is_pending
            FROM liane_member lm
            INNER JOIN "user" u ON u.id = lm.user_id
            WHERE lm.liane_id = ANY($1)
            ORDER BY lm.is_pending, lm.joined_at
        "#,
    )
    .bind(ids)
    .fetch_all(db)
    .await?;

    let waypoint_ids: Vec<Uuid> = rows
        .iter()
        .flat_map(|row| row.waypoints.iter().copied())
        .collect();
    let points = rallying_point::service::find_by_ids(db, &waypoint_ids).await?;

    let mut members_by_liane: HashMap<Uuid, Vec<LianeMember>> = HashMap::new();
    for row in member_rows {
        members_by_liane
            .entry(row.liane_id)
            .or_default()
            .push(LianeMember {
                user: row.user,
                liane_request_id: row.liane_request_id,
                joined_at: row.joined_at,
                is_pending: row.is_pending,
            });
    }

    Ok(rows
        .into_iter()
        .map(|row| Liane {
            id: row.id,
            waypoints: row
                .waypoints
                .iter()
                .filter_map(|id| points.get(id).cloned())
                .collect(),
            round_trip: row.round_trip,
            arrive_before: row.arrive_before,
            return_after: row.return_after,
            week_days: row.week_days,
            created_at: row.created_at,
            members: members_by_liane.remove(&row.id).unwrap_or_default(),
        })
        .collect())
}

pub async fn create(db: &PgPool, user_id: &Uuid, input: &CreateLiane) -> Result<Liane> {
    let mut tx = db.begin().await?;

    ensure_detached_own_request(&mut tx, user_id, &input.liane_request_id).await?;

    let target_user_id: Uuid = sqlx::query_scalar(
        r#"
            SELECT user_id
            FROM liane_request
            WHERE id = $1
              AND user_id <> $2
              AND is_enabled
        "#,
    )
    .bind(input.target_liane_request_id)
    .bind(user_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;

    ensure_detached(&mut tx, &input.target_liane_request_id).await?;

    let liane_id: Uuid = sqlx::query_scalar(
        r#"
            INSERT INTO liane (waypoints, round_trip, arrive_before, return_after, week_days)
            SELECT waypoints, round_trip, arrive_before, return_after, week_days
            FROM liane_request
            WHERE id = $1
            RETURNING id
        "#,
    )
    .bind(input.target_liane_request_id)
    .fetch_one(&mut *tx)
    .await?;

    add_member(
        &mut tx,
        &liane_id,
        &target_user_id,
        &input.target_liane_request_id,
        false,
    )
    .await?;
    add_member(&mut tx, &liane_id, user_id, &input.liane_request_id, true).await?;

    tx.commit().await?;

    find(db, user_id, &liane_id)
        .await?
        .ok_or(AppError::NotFound)
}

pub async fn join(
    db: &PgPool,
    user_id: &Uuid,
    id: &Uuid,
    liane_request_id: &Uuid,
) -> Result<Liane> {
    let mut tx = db.begin().await?;

    let liane_exists: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM liane WHERE id = $1)")
        .bind(id)
        .fetch_one(&mut *tx)
        .await?;
    if !liane_exists {
        return Err(AppError::NotFound);
    }

    let is_member: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM liane_member WHERE liane_id = $1 AND user_id = $2)",
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(&mut *tx)
    .await?;
    if is_member {
        return Err(AppError::Conflict(
            "User is already a member of this liane".to_string(),
        ));
    }

    ensure_detached_own_request(&mut tx, user_id, liane_request_id).await?;
    add_member(&mut tx, id, user_id, liane_request_id, true).await?;

    tx.commit().await?;

    find(db, user_id, id).await?.ok_or(AppError::NotFound)
}

pub async fn accept(
    db: &PgPool,
    user_id: &Uuid,
    id: &Uuid,
    member_id: &Uuid,
) -> Result<Option<Liane>> {
    let accepted = sqlx::query(
        r#"
            UPDATE liane_member pending
            SET is_pending = false,
                joined_at = NOW()
            WHERE pending.liane_id = $1
              AND pending.user_id = $2
              AND pending.is_pending
              AND EXISTS (
                  SELECT 1
                  FROM liane_member me
                  WHERE me.liane_id = $1
                    AND me.user_id = $3
                    AND NOT me.is_pending
              )
        "#,
    )
    .bind(id)
    .bind(member_id)
    .bind(user_id)
    .execute(db)
    .await?;

    if accepted.rows_affected() == 0 {
        return Ok(None);
    }

    find(db, user_id, id).await
}

pub async fn remove_member(
    db: &PgPool,
    user_id: &Uuid,
    id: &Uuid,
    member_id: &Uuid,
) -> Result<bool> {
    let mut tx = db.begin().await?;

    let removed = sqlx::query(
        r#"
            DELETE FROM liane_member removed
            WHERE removed.liane_id = $1
              AND removed.user_id = $2
              AND (
                  removed.user_id = $3
                  OR (
                      removed.is_pending
                      AND EXISTS (
                          SELECT 1
                          FROM liane_member me
                          WHERE me.liane_id = $1
                            AND me.user_id = $3
                            AND NOT me.is_pending
                      )
                  )
              )
        "#,
    )
    .bind(id)
    .bind(member_id)
    .bind(user_id)
    .execute(&mut *tx)
    .await?;

    if removed.rows_affected() == 0 {
        return Ok(false);
    }

    delete_if_abandoned(&mut tx, id).await?;

    tx.commit().await?;

    Ok(true)
}

async fn ensure_detached_own_request(
    connection: &mut PgConnection,
    user_id: &Uuid,
    liane_request_id: &Uuid,
) -> Result<()> {
    let is_owned: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM liane_request WHERE id = $1 AND user_id = $2)",
    )
    .bind(liane_request_id)
    .bind(user_id)
    .fetch_one(&mut *connection)
    .await?;

    if !is_owned {
        return Err(AppError::NotFound);
    }

    ensure_detached(connection, liane_request_id).await
}

async fn ensure_detached(connection: &mut PgConnection, liane_request_id: &Uuid) -> Result<()> {
    let is_attached: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM liane_member WHERE liane_request_id = $1)",
    )
    .bind(liane_request_id)
    .fetch_one(connection)
    .await?;

    if is_attached {
        return Err(AppError::Conflict(
            "Liane request is already attached to a liane".to_string(),
        ));
    }
    Ok(())
}

async fn add_member(
    connection: &mut PgConnection,
    liane_id: &Uuid,
    user_id: &Uuid,
    liane_request_id: &Uuid,
    is_pending: bool,
) -> Result<()> {
    sqlx::query(
        r#"
            INSERT INTO liane_member (liane_id, user_id, liane_request_id, is_pending)
            VALUES ($1, $2, $3, $4)
        "#,
    )
    .bind(liane_id)
    .bind(user_id)
    .bind(liane_request_id)
    .bind(is_pending)
    .execute(connection)
    .await?;
    Ok(())
}

async fn delete_if_abandoned(connection: &mut PgConnection, liane_id: &Uuid) -> Result<()> {
    sqlx::query(
        r#"
            DELETE FROM liane
            WHERE id = $1
              AND (
                  NOT EXISTS (
                      SELECT 1 FROM liane_member WHERE liane_id = $1 AND NOT is_pending
                  )
                  OR (SELECT COUNT(*) FROM liane_member WHERE liane_id = $1) < 2
              )
        "#,
    )
    .bind(liane_id)
    .execute(connection)
    .await?;
    Ok(())
}
