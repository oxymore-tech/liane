use chrono::{DateTime, Utc};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::fr_time::paris_month;
use crate::trip::model::{TripRole, TripStop, TripUser};
use crate::wallet::model::{
    Month, Statement, StatementEntry, StatementRow, Wallet, cost_share_cents,
};

#[derive(Debug, FromRow)]
struct DueShare {
    passenger_id: Uuid,
    driver_id: Uuid,
    distance_meters: i32,
    departure_time: DateTime<Utc>,
}

pub async fn find(db: &PgPool, cents_per_km: Option<i32>, user_id: &Uuid) -> Result<Wallet> {
    let opened_at: Option<DateTime<Utc>> =
        sqlx::query_scalar(r#"SELECT wallet_opened_at FROM "user" WHERE id = $1"#)
            .bind(user_id)
            .fetch_one(db)
            .await?;
    Ok(Wallet::of(cents_per_km, opened_at))
}

pub async fn open(db: &PgPool, cents_per_km: Option<i32>, user_id: &Uuid) -> Result<Wallet> {
    let cents_per_km = cents_per_km.ok_or(AppError::NotFound)?;
    let opened_at: DateTime<Utc> = sqlx::query_scalar(
        r#"
            UPDATE "user"
            SET wallet_opened_at = COALESCE(wallet_opened_at, NOW())
            WHERE id = $1
            RETURNING wallet_opened_at
        "#,
    )
    .bind(user_id)
    .fetch_one(db)
    .await?;
    Ok(Wallet::Open {
        cents_per_km,
        opened_at,
    })
}

/// Les lignes déjà inscrites restent dues.
pub async fn close(db: &PgPool, cents_per_km: Option<i32>, user_id: &Uuid) -> Result<Wallet> {
    let cents_per_km = cents_per_km.ok_or(AppError::NotFound)?;
    sqlx::query(r#"UPDATE "user" SET wallet_opened_at = NULL WHERE id = $1"#)
        .bind(user_id)
        .execute(db)
        .await?;
    Ok(Wallet::Closed { cents_per_km })
}

/// Inscrit la part des frais de chaque passager du trajet qui est monté puis descendu, si lui et le
/// conducteur avaient un porte-monnaie quand il est descendu. Une seule ligne par passager et par
/// trajet : rappeler la fonction ne change rien.
pub async fn record_entries(db: &PgPool, cents_per_km: Option<i32>, trip_id: &Uuid) -> Result<()> {
    let Some(cents_per_km) = cents_per_km else {
        return Ok(());
    };
    for share in find_due_shares(db, trip_id).await? {
        sqlx::query(
            r#"
                INSERT INTO wallet_entry (
                    trip_id, passenger_id, driver_id, distance_meters, cents_per_km, amount_cents, month
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (trip_id, passenger_id) DO NOTHING
            "#,
        )
        .bind(trip_id)
        .bind(share.passenger_id)
        .bind(share.driver_id)
        .bind(share.distance_meters)
        .bind(cents_per_km)
        .bind(cost_share_cents(share.distance_meters, cents_per_km))
        .bind(paris_month(share.departure_time))
        .execute(db)
        .await?;
        tracing::info!(
            trip_id = %trip_id,
            passenger_id = %share.passenger_id,
            "cost share recorded"
        );
    }
    Ok(())
}

async fn find_due_shares(db: &PgPool, trip_id: &Uuid) -> Result<Vec<DueShare>> {
    let shares = sqlx::query_as::<_, DueShare>(
        r#"
            SELECT
                tm.user_id AS passenger_id,
                t.driver_id,
                tm.distance_meters,
                t.departure_time
            FROM trip_member tm
            INNER JOIN trip t ON t.id = tm.trip_id
            INNER JOIN "user" passenger ON passenger.id = tm.user_id
            INNER JOIN "user" driver ON driver.id = t.driver_id
            INNER JOIN trip_event alighting
                ON alighting.trip_id = tm.trip_id
                AND alighting.user_id = tm.user_id
                AND alighting.kind = 'End'
            WHERE tm.trip_id = $1
              AND tm.canceled_at IS NULL
              AND passenger.wallet_opened_at <= alighting.recorded_at
              AND driver.wallet_opened_at <= alighting.recorded_at
              AND EXISTS (
                  SELECT 1 FROM trip_event boarding
                  WHERE boarding.trip_id = tm.trip_id
                    AND boarding.user_id = tm.user_id
                    AND boarding.kind = 'Start'
              )
              AND NOT EXISTS (
                  SELECT 1 FROM wallet_entry w
                  WHERE w.trip_id = tm.trip_id AND w.passenger_id = tm.user_id
              )
        "#,
    )
    .bind(trip_id)
    .fetch_all(db)
    .await?;
    Ok(shares)
}

pub async fn find_statement(db: &PgPool, user_id: &Uuid, month: Month) -> Result<Statement> {
    let rows = sqlx::query_as::<_, StatementRow>(
        r#"
            SELECT
                w.trip_id,
                w.passenger_id,
                counterpart.id AS counterpart_id,
                counterpart.pseudo AS counterpart_pseudo,
                t.departure_time,
                origin.id AS from_id,
                origin.label AS from_label,
                origin.city AS from_city,
                destination.id AS to_id,
                destination.label AS to_label,
                destination.city AS to_city,
                w.distance_meters,
                w.cents_per_km,
                w.amount_cents
            FROM wallet_entry w
            INNER JOIN trip t ON t.id = w.trip_id
            INNER JOIN trip_member tm ON tm.trip_id = w.trip_id AND tm.user_id = w.passenger_id
            INNER JOIN "user" counterpart
                ON counterpart.id = CASE WHEN w.passenger_id = $1 THEN w.driver_id ELSE w.passenger_id END
            INNER JOIN rallying_point origin ON origin.id = tm.from_rp_id
            INNER JOIN rallying_point destination ON destination.id = tm.to_rp_id
            WHERE (w.passenger_id = $1 OR w.driver_id = $1)
              AND w.month = $2
            ORDER BY t.departure_time, w.id
        "#,
    )
    .bind(user_id)
    .bind(month.first_day())
    .fetch_all(db)
    .await?;

    Ok(Statement::new(
        month,
        rows.into_iter().map(|row| to_entry(row, user_id)).collect(),
    ))
}

fn to_entry(row: StatementRow, holder_id: &Uuid) -> StatementEntry {
    StatementEntry {
        trip_id: row.trip_id,
        role: if &row.passenger_id == holder_id {
            TripRole::Passenger
        } else {
            TripRole::Driver
        },
        counterpart: TripUser {
            id: row.counterpart_id,
            pseudo: row.counterpart_pseudo,
        },
        departure_time: row.departure_time,
        from_stop: TripStop {
            id: row.from_id,
            label: row.from_label,
            city: row.from_city,
        },
        to_stop: TripStop {
            id: row.to_id,
            label: row.to_label,
            city: row.to_city,
        },
        distance_meters: row.distance_meters,
        cents_per_km: row.cents_per_km,
        amount_cents: row.amount_cents,
    }
}
