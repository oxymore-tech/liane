use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::liane::model::{Report, ReportRow, ReportUser, ReportedLiane};
use crate::liane::service;

const MAX_REASON_LENGTH: usize = 500;

pub async fn create(
    db: &PgPool,
    reporter_id: &Uuid,
    liane_id: &Uuid,
    reported_id: &Uuid,
    reason: &str,
) -> Result<()> {
    let reason = reason.trim();
    if reason.is_empty() || reason.chars().count() > MAX_REASON_LENGTH || reporter_id == reported_id
    {
        return Err(AppError::BadRequest);
    }

    if !service::is_member(db, liane_id, reporter_id).await? {
        return Err(AppError::Forbidden);
    }
    if !service::is_member(db, liane_id, reported_id).await? {
        return Err(AppError::NotFound);
    }

    let inserted = sqlx::query(
        r#"
            INSERT INTO liane_report (liane_id, reported_user_id, reporter_user_id, reason)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (liane_id, reported_user_id, reporter_user_id) WHERE status = 'Open'
            DO NOTHING
        "#,
    )
    .bind(liane_id)
    .bind(reported_id)
    .bind(reporter_id)
    .bind(reason)
    .execute(db)
    .await?;

    if inserted.rows_affected() == 0 {
        return Err(AppError::Conflict(
            "An open report already exists for this member".to_string(),
        ));
    }
    Ok(())
}

pub async fn list_open(db: &PgPool) -> Result<Vec<Report>> {
    let rows = sqlx::query_as::<_, ReportRow>(
        r#"
            SELECT
                r.id,
                l.id AS liane_id,
                l.name AS liane_name,
                l.slug AS liane_slug,
                reported.id AS reported_id,
                reported.pseudo AS reported_pseudo,
                reporter.id AS reporter_id,
                reporter.pseudo AS reporter_pseudo,
                r.reason,
                r.created_at,
                EXISTS (
                    SELECT 1
                    FROM liane_member lm
                    WHERE lm.liane_id = r.liane_id
                      AND lm.user_id = r.reported_user_id
                ) AS reported_is_member
            FROM liane_report r
            INNER JOIN liane l ON l.id = r.liane_id
            INNER JOIN "user" reported ON reported.id = r.reported_user_id
            INNER JOIN "user" reporter ON reporter.id = r.reporter_user_id
            WHERE r.status = 'Open'
            ORDER BY r.created_at
        "#,
    )
    .fetch_all(db)
    .await?;

    Ok(rows.into_iter().map(to_report).collect())
}

/// Exclut le membre signalé et clôt tous les signalements ouverts qui le visent dans cette liane.
/// Renvoie la liane et le membre exclu.
pub async fn exclude(
    db: &PgPool,
    admin_id: &Uuid,
    report_id: &Uuid,
) -> Result<Option<(Uuid, Uuid)>> {
    let mut tx = db.begin().await?;

    let target: Option<(Uuid, Uuid)> = sqlx::query_as(
        r#"
            SELECT liane_id, reported_user_id
            FROM liane_report
            WHERE id = $1
              AND status = 'Open'
            FOR UPDATE
        "#,
    )
    .bind(report_id)
    .fetch_optional(&mut *tx)
    .await?;
    let Some((liane_id, reported_id)) = target else {
        return Ok(None);
    };

    sqlx::query("DELETE FROM liane_member WHERE liane_id = $1 AND user_id = $2")
        .bind(liane_id)
        .bind(reported_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        r#"
            UPDATE liane_report
            SET status = 'Excluded',
                resolved_at = NOW(),
                resolved_by = $3
            WHERE liane_id = $1
              AND reported_user_id = $2
              AND status = 'Open'
        "#,
    )
    .bind(liane_id)
    .bind(reported_id)
    .bind(admin_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(Some((liane_id, reported_id)))
}

pub async fn dismiss(db: &PgPool, admin_id: &Uuid, report_id: &Uuid) -> Result<bool> {
    let dismissed = sqlx::query(
        r#"
            UPDATE liane_report
            SET status = 'Dismissed',
                resolved_at = NOW(),
                resolved_by = $2
            WHERE id = $1
              AND status = 'Open'
        "#,
    )
    .bind(report_id)
    .bind(admin_id)
    .execute(db)
    .await?;
    Ok(dismissed.rows_affected() > 0)
}

fn to_report(row: ReportRow) -> Report {
    Report {
        id: row.id,
        liane: ReportedLiane {
            id: row.liane_id,
            name: row.liane_name,
            slug: row.liane_slug,
        },
        reported: ReportUser {
            id: row.reported_id,
            pseudo: row.reported_pseudo,
        },
        reporter: ReportUser {
            id: row.reporter_id,
            pseudo: row.reporter_pseudo,
        },
        reason: row.reason,
        created_at: row.created_at,
        reported_is_member: row.reported_is_member,
    }
}
