use std::collections::HashMap;

use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::liane::model::{
    LianeRequestMatches, LianeSearchResult, MatchRow, MatchedRequest, RequestMatch, SearchQuery,
};
use crate::liane::service;
use crate::rallying_point;
use crate::rallying_point::model::RallyingPoint;
use crate::user::model::PublicUser;

const MATCH_DISTANCE_METERS: f64 = 2000.0;
const MIN_SCORE: f64 = 1.0 / 3.0;

pub async fn find_matches(
    db: &PgPool,
    user_id: &Uuid,
    liane_request_id: &Uuid,
) -> Result<LianeRequestMatches> {
    let waypoints: Vec<Uuid> =
        sqlx::query_scalar("SELECT waypoints FROM liane_request WHERE id = $1 AND user_id = $2")
            .bind(liane_request_id)
            .bind(user_id)
            .fetch_optional(db)
            .await?
            .ok_or(AppError::NotFound)?;

    Ok(LianeRequestMatches {
        lianes: find_lianes(db, &waypoints).await?,
        requests: find_requests(db, liane_request_id).await?,
    })
}

async fn find_lianes(db: &PgPool, waypoints: &[Uuid]) -> Result<Vec<LianeSearchResult>> {
    let points = rallying_point::service::find_by_ids(db, waypoints).await?;
    let ends = (
        waypoints.first().and_then(|id| points.get(id)),
        waypoints.last().and_then(|id| points.get(id)),
    );
    let (Some(from), Some(to)) = ends else {
        return Ok(Vec::new());
    };

    let query = SearchQuery {
        from_lat: from.lat,
        from_lng: from.lng,
        to_lat: to.lat,
        to_lng: to.lng,
        radius: None,
    };
    service::search(db, &query).await
}

async fn find_requests(db: &PgPool, liane_request_id: &Uuid) -> Result<Vec<RequestMatch>> {
    let rows = find_match_rows(db, liane_request_id).await?;

    let waypoint_ids: Vec<Uuid> = rows
        .iter()
        .flat_map(|row| row.waypoints.iter().copied())
        .collect();
    let points = rallying_point::service::find_by_ids(db, &waypoint_ids).await?;

    Ok(rows
        .iter()
        .map(|row| RequestMatch {
            score: row.score,
            common_week_days: row.common_week_days.clone(),
            request: to_matched_request(row, &points),
        })
        .collect())
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
                WHERE mine.id = $1
                  AND (mine.week_days::bit(7) & theirs.week_days::bit(7)) <> B'0000000'
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
