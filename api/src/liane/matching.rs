use std::collections::{HashMap, HashSet};

use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::liane::model::{
    Liane, LianeMatch, LianeRequestState, MatchRow, MatchTarget, MatchedRequest,
};
use crate::liane::service;
use crate::rallying_point;
use crate::rallying_point::model::RallyingPoint;
use crate::user::model::PublicUser;

const MATCH_DISTANCE_METERS: f64 = 2000.0;
const MIN_SCORE: f64 = 1.0 / 3.0;

pub async fn find_state(
    db: &PgPool,
    user_id: &Uuid,
    liane_request_id: &Uuid,
) -> Result<LianeRequestState> {
    let is_owned: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM liane_request WHERE id = $1 AND user_id = $2)",
    )
    .bind(liane_request_id)
    .bind(user_id)
    .fetch_one(db)
    .await?;

    if !is_owned {
        return Err(AppError::NotFound);
    }

    let attached_liane_id: Option<Uuid> =
        sqlx::query_scalar("SELECT liane_id FROM liane_member WHERE liane_request_id = $1")
            .bind(liane_request_id)
            .fetch_optional(db)
            .await?;

    if let Some(liane_id) = attached_liane_id {
        let liane = service::find(db, user_id, &liane_id)
            .await?
            .ok_or(AppError::NotFound)?;
        return Ok(LianeRequestState::Attached { liane });
    }

    let matches = find_matches(db, liane_request_id).await?;
    Ok(LianeRequestState::Detached { matches })
}

async fn find_matches(db: &PgPool, liane_request_id: &Uuid) -> Result<Vec<LianeMatch>> {
    let rows = find_match_rows(db, liane_request_id).await?;

    let liane_ids: Vec<Uuid> = rows.iter().filter_map(|row| row.liane_id).collect();
    let mut lianes: HashMap<Uuid, Liane> = service::find_by_ids(db, &liane_ids)
        .await?
        .into_iter()
        .map(|liane| (liane.id, liane))
        .collect();

    let waypoint_ids: Vec<Uuid> = rows
        .iter()
        .flat_map(|row| row.waypoints.iter().copied())
        .collect();
    let points = rallying_point::service::find_by_ids(db, &waypoint_ids).await?;

    let mut matched_liane_ids = HashSet::new();
    let mut matches = Vec::new();
    for row in rows {
        let target = match row.liane_id {
            Some(liane_id) => {
                if !matched_liane_ids.insert(liane_id) {
                    continue;
                }
                let Some(liane) = lianes.remove(&liane_id) else {
                    continue;
                };
                MatchTarget::Liane { liane }
            }
            None => MatchTarget::Request {
                request: to_matched_request(&row, &points),
            },
        };

        matches.push(LianeMatch {
            score: row.score,
            common_week_days: row.common_week_days,
            target,
        });
    }

    Ok(matches)
}

async fn find_match_rows(db: &PgPool, liane_request_id: &Uuid) -> Result<Vec<MatchRow>> {
    let rows = sqlx::query_as::<_, MatchRow>(
        r#"
            WITH request_line AS (
                SELECT
                    lr.*,
                    (
                        SELECT ST_MakeLine(rp.location::geometry ORDER BY waypoint.ordinal)
                        FROM unnest(lr.waypoints) WITH ORDINALITY AS waypoint(id, ordinal)
                        INNER JOIN rallying_point rp ON rp.id = waypoint.id
                    ) AS line
                FROM liane_request lr
            ),
            candidate AS (
                SELECT
                    theirs.id AS liane_request_id,
                    theirs.user_id,
                    u.pseudo,
                    u.gender,
                    u.picture_url,
                    theirs.name,
                    theirs.waypoints,
                    theirs.round_trip,
                    theirs.arrive_before,
                    theirs.return_after,
                    theirs.week_days,
                    (mine.week_days::bit(7) & theirs.week_days::bit(7))::text AS common_week_days,
                    lm.liane_id,
                    LEAST(
                        1,
                        ST_Length(
                            ST_Intersection(
                                theirs.line,
                                ST_Buffer(mine.line::geography, $2)::geometry
                            )::geography
                        ) / NULLIF(ST_Length(mine.line::geography), 0)
                    ) AS score
                FROM request_line mine
                INNER JOIN request_line theirs ON
                    theirs.user_id <> mine.user_id
                    AND theirs.is_enabled
                    AND ST_DWithin(mine.line::geography, theirs.line::geography, $2)
                    AND ST_LineLocatePoint(theirs.line, ST_StartPoint(mine.line))
                        < ST_LineLocatePoint(theirs.line, ST_EndPoint(mine.line))
                INNER JOIN "user" u ON u.id = theirs.user_id
                LEFT JOIN liane_member lm ON lm.liane_request_id = theirs.id
                WHERE mine.id = $1
                  AND (mine.week_days::bit(7) & theirs.week_days::bit(7)) <> B'0000000'
                  AND (lm.liane_id IS NULL OR NOT lm.is_pending)
                  AND NOT EXISTS (
                      SELECT 1
                      FROM liane_member own
                      WHERE own.liane_id = lm.liane_id
                        AND own.user_id = mine.user_id
                  )
            )
            SELECT
                liane_request_id,
                user_id,
                pseudo,
                gender,
                picture_url,
                name,
                waypoints,
                round_trip,
                arrive_before,
                return_after,
                week_days,
                common_week_days,
                liane_id,
                score
            FROM candidate
            WHERE score >= $3
            ORDER BY score DESC, liane_request_id
        "#,
    )
    .bind(liane_request_id)
    .bind(MATCH_DISTANCE_METERS)
    .bind(MIN_SCORE)
    .fetch_all(db)
    .await?;
    Ok(rows)
}

fn to_matched_request(row: &MatchRow, points: &HashMap<Uuid, RallyingPoint>) -> MatchedRequest {
    MatchedRequest {
        id: row.liane_request_id,
        name: row.name.clone(),
        user: PublicUser {
            id: row.user_id,
            pseudo: row.pseudo.clone(),
            gender: row.gender.clone(),
            picture_url: row.picture_url.clone(),
        },
        waypoints: row
            .waypoints
            .iter()
            .filter_map(|id| points.get(id).cloned())
            .collect(),
        round_trip: row.round_trip,
        arrive_before: row.arrive_before,
        return_after: row.return_after,
        week_days: row.week_days.clone(),
    }
}
