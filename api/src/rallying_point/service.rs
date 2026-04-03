use sqlx::PgPool;

use crate::error::Result;
use crate::rallying_point::model::RallyingPoint;

pub async fn search(
    db: &PgPool,
    search: &str,
    lat: f64,
    lng: f64,
    limit: i64,
) -> Result<Vec<RallyingPoint>> {
    let results = sqlx::query_as::<_, RallyingPoint>(
        r#"
            SELECT
                id,
                label,
                ST_Y(location::geometry) AS lat,
                ST_X(location::geometry) AS lng,
                type,
                address,
                zip_code,
                city,
                place_count,
                is_active
            FROM rallying_point
            WHERE is_active = true
              AND ($1 = '' OR to_tsvector('french', label || ' ' || city) @@ plainto_tsquery('french', $1))
            ORDER BY location <-> ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography
            LIMIT $4
        "#,
    )
    .bind(search)
    .bind(lat)
    .bind(lng)
    .bind(limit)
    .fetch_all(db)
    .await?;
    Ok(results)
}

pub async fn snap(db: &PgPool, lat: f64, lng: f64) -> Result<Option<RallyingPoint>> {
    let result = sqlx::query_as::<_, RallyingPoint>(
        r#"
            SELECT
                id,
                label,
                ST_Y(location::geometry) AS lat,
                ST_X(location::geometry) AS lng,
                type,
                address,
                zip_code,
                city,
                place_count,
                is_active
            FROM rallying_point
            WHERE is_active = true
            ORDER BY location <-> ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
            LIMIT 1
        "#,
    )
    .bind(lat)
    .bind(lng)
    .fetch_optional(db)
    .await?;
    Ok(result)
}

pub async fn bbox(
    db: &PgPool,
    lat: f64,
    lng: f64,
    lat2: f64,
    lng2: f64,
    limit: i64,
) -> Result<Vec<RallyingPoint>> {
    let results = sqlx::query_as::<_, RallyingPoint>(
        r#"
            SELECT
                id,
                label,
                ST_Y(location::geometry) AS lat,
                ST_X(location::geometry) AS lng,
                type,
                address,
                zip_code,
                city,
                place_count,
                is_active
            FROM rallying_point
            WHERE is_active = true
              AND location::geometry && ST_MakeEnvelope($2, $1, $4, $3, 4326)
            LIMIT $5
        "#,
    )
    .bind(lat)
    .bind(lng)
    .bind(lat2)
    .bind(lng2)
    .bind(limit)
    .fetch_all(db)
    .await?;
    Ok(results)
}
