use std::collections::HashMap;

use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::liane;
use crate::rallying_point::model::{
    AdminRallyingPoint, KindInput, RallyingPoint, RallyingPointInput, RallyingPointKind,
};

const MAX_LABEL_LENGTH: usize = 255;
const MAX_ADDRESS_LENGTH: usize = 500;
const MAX_ZIP_CODE_LENGTH: usize = 10;
const MAX_CITY_LENGTH: usize = 100;
/// En dessous (environ un centimètre), le point n'a pas bougé.
const MOVE_TOLERANCE_DEGREES: f64 = 1e-7;

const ADMIN_SELECT: &str = r#"
    SELECT
        rp.id,
        rp.label,
        ST_Y(rp.location::geometry) AS lat,
        ST_X(rp.location::geometry) AS lng,
        rp.kind,
        rp.address,
        rp.zip_code,
        rp.city,
        rp.place_count,
        rp.is_active,
        split_part(rp.source_key, ':', 1) AS source,
        rp.edited_at,
        COALESCE(
            (
                SELECT array_agg(l.name ORDER BY l.name)
                FROM liane_stop s
                INNER JOIN liane l ON l.id = s.liane_id
                WHERE s.rallying_point_id = rp.id
            ),
            '{}'
        ) AS lianes
    FROM rallying_point rp
"#;

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
                kind,
                address,
                zip_code,
                city,
                place_count,
                is_active
            FROM rallying_point
            WHERE is_active = true
              AND (
                  $1 = ''
                  OR to_tsvector('french', label || ' ' || city) @@ plainto_tsquery('french', $1)
                  OR city ILIKE $1 || '%'
                  OR label ILIKE '%' || $1 || '%'
              )
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
                kind,
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
                kind,
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

pub async fn find_by_ids(db: &PgPool, ids: &[Uuid]) -> Result<HashMap<Uuid, RallyingPoint>> {
    let results = sqlx::query_as::<_, RallyingPoint>(
        r#"
            SELECT
                id,
                label,
                ST_Y(location::geometry) AS lat,
                ST_X(location::geometry) AS lng,
                kind,
                address,
                zip_code,
                city,
                place_count,
                is_active
            FROM rallying_point
            WHERE id = ANY($1)
        "#,
    )
    .bind(ids)
    .fetch_all(db)
    .await?;
    Ok(results.into_iter().map(|point| (point.id, point)).collect())
}

/// Recherche pour l'administration : points désactivés compris, les plus proches de (`lat`, `lng`)
/// d'abord, par libellé sans position.
pub async fn admin_search(
    db: &PgPool,
    search: &str,
    lat: Option<f64>,
    lng: Option<f64>,
    limit: i64,
) -> Result<Vec<AdminRallyingPoint>> {
    let sql = format!(
        r#"
            {ADMIN_SELECT}
            WHERE $1 = ''
               OR to_tsvector('french', rp.label || ' ' || rp.city) @@ plainto_tsquery('french', $1)
               OR rp.city ILIKE $1 || '%'
               OR rp.label ILIKE '%' || $1 || '%'
            ORDER BY rp.location <-> ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, rp.label, rp.id
            LIMIT $4
        "#
    );
    let results = sqlx::query_as::<_, AdminRallyingPoint>(&sql)
        .bind(search)
        .bind(lat)
        .bind(lng)
        .bind(limit)
        .fetch_all(db)
        .await?;
    Ok(results)
}

pub async fn find_admin(db: &PgPool, id: &Uuid) -> Result<Option<AdminRallyingPoint>> {
    let sql = format!("{ADMIN_SELECT} WHERE rp.id = $1");
    let result = sqlx::query_as::<_, AdminRallyingPoint>(&sql)
        .bind(id)
        .fetch_optional(db)
        .await?;
    Ok(result)
}

pub async fn create(db: &PgPool, input: &RallyingPointInput) -> Result<AdminRallyingPoint> {
    let point = validated(input)?;
    let id: Uuid = sqlx::query_scalar(
        r#"
            INSERT INTO rallying_point (label, location, kind, address, zip_code, city, place_count, is_active, edited_at)
            VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING id
        "#,
    )
    .bind(point.label)
    .bind(input.lat)
    .bind(input.lng)
    .bind(point.kind)
    .bind(point.address)
    .bind(point.zip_code)
    .bind(point.city)
    .bind(input.place_count)
    .bind(input.is_active)
    .fetch_one(db)
    .await?;

    find_admin(db, &id).await?.ok_or(AppError::NotFound)
}

/// Un arrêt de liane ne peut pas être désactivé. S'il est déplacé, le tracé de ses lianes est recalculé
/// (en ligne droite si OSRM ne répond pas).
pub async fn update(
    db: &PgPool,
    osrm_url: &str,
    id: &Uuid,
    input: &RallyingPointInput,
) -> Result<Option<AdminRallyingPoint>> {
    let point = validated(input)?;
    let mut tx = db.begin().await?;

    let current: Option<(f64, f64, bool)> = sqlx::query_as(
        r#"
            SELECT ST_Y(location::geometry), ST_X(location::geometry), is_active
            FROM rallying_point
            WHERE id = $1
            FOR UPDATE
        "#,
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?;
    let Some((lat, lng, was_active)) = current else {
        return Ok(None);
    };

    let lianes: Vec<(Uuid, String)> = sqlx::query_as(
        r#"
            SELECT l.id, l.name
            FROM liane_stop s
            INNER JOIN liane l ON l.id = s.liane_id
            WHERE s.rallying_point_id = $1
            ORDER BY l.name
        "#,
    )
    .bind(id)
    .fetch_all(&mut *tx)
    .await?;
    if was_active && !input.is_active && !lianes.is_empty() {
        let names: Vec<&str> = lianes.iter().map(|(_, name)| name.as_str()).collect();
        return Err(AppError::Conflict(format!(
            "StopOfLianes: {}",
            names.join(", ")
        )));
    }

    sqlx::query(
        r#"
            UPDATE rallying_point
            SET label = $2,
                location = ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
                kind = $5,
                address = $6,
                zip_code = $7,
                city = $8,
                place_count = $9,
                is_active = $10,
                edited_at = NOW()
            WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(point.label)
    .bind(input.lat)
    .bind(input.lng)
    .bind(point.kind)
    .bind(point.address)
    .bind(point.zip_code)
    .bind(point.city)
    .bind(input.place_count)
    .bind(input.is_active)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;

    let has_moved = (input.lat - lat).abs() > MOVE_TOLERANCE_DEGREES
        || (input.lng - lng).abs() > MOVE_TOLERANCE_DEGREES;
    if has_moved {
        for (liane_id, _) in &lianes {
            liane::recompute_liane_route(db, osrm_url, liane_id).await?;
        }
    }

    find_admin(db, id).await
}

struct ValidPoint<'a> {
    label: &'a str,
    kind: RallyingPointKind,
    address: &'a str,
    zip_code: &'a str,
    city: &'a str,
}

fn validated(input: &RallyingPointInput) -> Result<ValidPoint<'_>> {
    let invalid = |keyword: &str| AppError::Invalid(keyword.to_string());
    let is_short = |text: &str, max: usize| text.chars().count() <= max;

    let label = input.label.trim();
    if label.is_empty() || !is_short(label, MAX_LABEL_LENGTH) {
        return Err(invalid("InvalidLabel"));
    }
    if !(-90.0..=90.0).contains(&input.lat) || !(-180.0..=180.0).contains(&input.lng) {
        return Err(invalid("InvalidPosition"));
    }
    let kind = match &input.kind {
        KindInput::Known(kind) => kind.clone(),
        KindInput::Unknown(_) => return Err(invalid("InvalidKind")),
    };
    let (address, zip_code, city) = (
        input.address.trim(),
        input.zip_code.trim(),
        input.city.trim(),
    );
    if !is_short(address, MAX_ADDRESS_LENGTH) {
        return Err(invalid("InvalidAddress"));
    }
    if !is_short(zip_code, MAX_ZIP_CODE_LENGTH) {
        return Err(invalid("InvalidZipCode"));
    }
    if !is_short(city, MAX_CITY_LENGTH) {
        return Err(invalid("InvalidCity"));
    }
    if input.place_count.is_some_and(|count| count < 0) {
        return Err(invalid("InvalidPlaceCount"));
    }

    Ok(ValidPoint {
        label,
        kind,
        address,
        zip_code,
        city,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input() -> RallyingPointInput {
        RallyingPointInput {
            label: " Parking de la gare ".to_string(),
            lat: 44.52,
            lng: 3.5,
            kind: KindInput::Known(RallyingPointKind::Parking),
            address: String::new(),
            zip_code: "48000".to_string(),
            city: "Mende".to_string(),
            place_count: Some(0),
            is_active: true,
        }
    }

    fn keyword(input: &RallyingPointInput) -> String {
        match validated(input) {
            Err(AppError::Invalid(keyword)) => keyword,
            _ => String::new(),
        }
    }

    #[test]
    fn a_valid_point_is_trimmed() {
        let input = input();
        let point = validated(&input).unwrap();
        assert_eq!(point.label, "Parking de la gare");
        assert!(matches!(point.kind, RallyingPointKind::Parking));
    }

    #[test]
    fn each_invalid_field_is_named() {
        let with = |change: fn(&mut RallyingPointInput)| {
            let mut input = input();
            change(&mut input);
            keyword(&input)
        };
        assert_eq!(with(|p| p.label = "  ".to_string()), "InvalidLabel");
        assert_eq!(with(|p| p.label = "x".repeat(256)), "InvalidLabel");
        assert_eq!(with(|p| p.lat = 91.0), "InvalidPosition");
        assert_eq!(with(|p| p.lng = -180.5), "InvalidPosition");
        assert_eq!(with(|p| p.lat = f64::NAN), "InvalidPosition");
        assert_eq!(
            with(|p| p.kind = KindInput::Unknown("Gare".to_string())),
            "InvalidKind"
        );
        assert_eq!(with(|p| p.zip_code = "x".repeat(11)), "InvalidZipCode");
        assert_eq!(with(|p| p.city = "x".repeat(101)), "InvalidCity");
        assert_eq!(with(|p| p.place_count = Some(-1)), "InvalidPlaceCount");
    }
}
