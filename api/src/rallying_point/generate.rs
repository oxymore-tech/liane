use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use tracing::info;

use crate::error::Result;
use crate::rallying_point::model::RallyingPointKind;

const MIN_DISTANCE_METERS: f64 = 375.0;
const EARTH_RADIUS_METERS: f64 = 6_371_000.0;

const BNLC: &str = "bnlc";
const TOWN_HALLS: &str = "mairie";
const CUSTOM: &str = "liane";
const TEST_DEPARTMENTS: [&str; 7] = ["46", "31", "48", "09", "81", "82", "12"];

/// Un point tel que le donne sa source. `source_key` vaut `<source>:<identifiant dans la source>`.
#[derive(Debug, Clone)]
pub struct SourcePoint {
    pub source_key: String,
    pub label: String,
    pub lat: f64,
    pub lng: f64,
    pub kind: RallyingPointKind,
    pub address: String,
    pub zip_code: String,
    pub city: String,
    pub place_count: Option<i32>,
}

#[derive(Deserialize)]
struct BnlcEntry {
    id_lieu: String,
    nom_lieu: String,
    ad_lieu: String,
    com_lieu: String,
    #[serde(rename = "type")]
    kind: String,
    insee: String,
    #[serde(rename = "Xlong")]
    x_long: f64,
    #[serde(rename = "Ylat")]
    y_lat: f64,
    nbre_pl: Option<String>,
    #[allow(dead_code)]
    nbre_pmr: Option<String>,
}

#[derive(Deserialize)]
struct MairieEntry {
    #[serde(rename = "codeInsee")]
    code_insee: String,
    #[serde(rename = "CodePostal")]
    code_postal: String,
    #[serde(rename = "NomOrganisme")]
    nom_organisme: String,
    #[serde(rename = "NomCommune")]
    nom_commune: String,
    #[serde(rename = "Adresse")]
    adresse: String,
    #[serde(rename = "Latitude")]
    latitude: Option<f64>,
    #[serde(rename = "Longitude")]
    longitude: Option<f64>,
}

#[derive(Deserialize)]
struct ZipCodeEntry {
    zipcode: String,
    insee: String,
}

fn haversine(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    let (lat1, lng1, lat2, lng2) = (
        lat1.to_radians(),
        lng1.to_radians(),
        lat2.to_radians(),
        lng2.to_radians(),
    );
    let dlat = lat2 - lat1;
    let dlng = lng2 - lng1;
    let a = (dlat / 2.0).sin().powi(2) + lat1.cos() * lat2.cos() * (dlng / 2.0).sin().powi(2);
    2.0 * EARTH_RADIUS_METERS * a.sqrt().asin()
}

fn load_zipcodes() -> Result<HashMap<String, String>> {
    let data = include_str!("../../resources/cities_fr.csv");
    let mut rdr = csv::ReaderBuilder::new()
        .delimiter(b';')
        .from_reader(data.as_bytes());
    let mut map = HashMap::new();
    for result in rdr.deserialize::<ZipCodeEntry>() {
        let entry = result.map_err(crate::error::AppError::unexpected)?;
        map.entry(entry.insee).or_insert(entry.zipcode);
    }
    Ok(map)
}

fn load_bnlc(zipcodes: &HashMap<String, String>) -> Result<Vec<SourcePoint>> {
    let data = include_str!("../../resources/bnlc.csv");
    let mut rdr = csv::Reader::from_reader(data.as_bytes());
    let mut points = Vec::new();

    for result in rdr.deserialize::<BnlcEntry>() {
        let e = match result {
            Ok(e) => e,
            Err(err) => {
                tracing::warn!("skipping BNLC entry: {err}");
                continue;
            }
        };

        let kind = match e.kind.to_lowercase().as_str() {
            "aire de covoiturage" => RallyingPointKind::CarpoolArea,
            "sortie d'autoroute" => RallyingPointKind::HighwayExit,
            "parking" => RallyingPointKind::Parking,
            "supermarché" => RallyingPointKind::Supermarket,
            "parking relais" => RallyingPointKind::RelayParking,
            "délaissé routier" => RallyingPointKind::AbandonedRoad,
            "auto-stop" => RallyingPointKind::AutoStop,
            other => {
                tracing::warn!("unknown BNLC type: {other}");
                continue;
            }
        };

        let zip_code = zipcodes.get(&e.insee).cloned().unwrap_or_default();
        let place_count = e.nbre_pl.and_then(|s| s.parse::<i32>().ok()).filter(|&n| n > 0);

        points.push(SourcePoint {
            source_key: format!("{BNLC}:{}", e.id_lieu),
            label: e.nom_lieu,
            lat: e.y_lat,
            lng: e.x_long,
            kind,
            address: e.ad_lieu,
            zip_code,
            city: e.com_lieu,
            place_count,
        });
    }
    Ok(points)
}

fn load_mairies() -> Result<Vec<SourcePoint>> {
    let data = include_str!("../../resources/mairies.csv");
    let mut rdr = csv::Reader::from_reader(data.as_bytes());
    let mut points = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for result in rdr.deserialize::<MairieEntry>() {
        let e = match result {
            Ok(e) => e,
            Err(err) => {
                tracing::warn!("skipping mairie entry: {err}");
                continue;
            }
        };

        let (Some(lat), Some(lng)) = (e.latitude, e.longitude) else {
            continue;
        };

        if !seen.insert(e.code_insee.clone()) {
            continue;
        }

        points.push(SourcePoint {
            source_key: format!("{TOWN_HALLS}:{}", e.code_insee),
            label: e.nom_organisme,
            lat,
            lng,
            kind: RallyingPointKind::TownHall,
            address: e.adresse,
            zip_code: e.code_postal,
            city: e.nom_commune,
            place_count: None,
        });
    }
    Ok(points)
}

fn load_custom() -> Vec<SourcePoint> {
    vec![
        SourcePoint {
            source_key: format!("{CUSTOM}:living-objects"),
            label: "Living Objects".into(),
            lat: 43.567936,
            lng: 1.390924,
            kind: RallyingPointKind::Parking,
            address: "1 impasse Marcel Chalard".into(),
            zip_code: "31000".into(),
            city: "Toulouse".into(),
            place_count: Some(10),
        },
        SourcePoint {
            source_key: format!("{CUSTOM}:michel-labrousse"),
            label: "Michel Labrousse".into(),
            lat: 43.568356,
            lng: 1.386925,
            kind: RallyingPointKind::Parking,
            address: "11 rue Michel Labrousse".into(),
            zip_code: "31000".into(),
            city: "Toulouse".into(),
            place_count: None,
        },
        SourcePoint {
            source_key: format!("{CUSTOM}:basso-compotes"),
            label: "Basso com'pôtes".into(),
            lat: 43.565190,
            lng: 1.388705,
            kind: RallyingPointKind::Supermarket,
            address: "17 rue Paulin Talabot".into(),
            zip_code: "31000".into(),
            city: "Toulouse".into(),
            place_count: None,
        },
    ]
}

/// Ne garde qu'un point par voisinage de 375 m : en partant de l'est, chaque point retenu écarte ses
/// voisins plus à l'ouest. Le résultat ne dépend que des points donnés, pas de leur ordre d'arrivée.
fn cluster(mut points: Vec<SourcePoint>) -> Vec<SourcePoint> {
    points.retain(|point| point.lat.is_finite() && point.lng.is_finite());
    points.sort_by(|a, b| {
        a.lng
            .total_cmp(&b.lng)
            .then_with(|| a.source_key.cmp(&b.source_key))
    });

    let mut is_dropped = vec![false; points.len()];
    for i in (0..points.len()).rev() {
        if is_dropped[i] {
            continue;
        }
        for j in (0..i).rev() {
            if (points[i].lng - points[j].lng).abs() > 0.01 {
                break;
            }
            if !is_dropped[j]
                && haversine(points[i].lat, points[i].lng, points[j].lat, points[j].lng)
                    <= MIN_DISTANCE_METERS
            {
                is_dropped[j] = true;
            }
        }
    }

    let mut kept: Vec<SourcePoint> = points
        .into_iter()
        .zip(is_dropped)
        .filter_map(|(point, is_dropped)| (!is_dropped).then_some(point))
        .collect();
    kept.reverse();
    kept
}

/// Bilan d'une régénération. `count` : points actifs issus des sources traitées.
/// `adopted` : points d'avant la clé stable qui ont retrouvé la leur (identifiant conservé).
/// `deactivated_in_use` : parmi les points désactivés, ceux qui servent encore à une liane ou à un trajet.
#[derive(Debug, Default, PartialEq, Serialize)]
pub struct SyncReport {
    pub count: u64,
    pub inserted: u64,
    pub updated: u64,
    pub reactivated: u64,
    pub deactivated: u64,
    pub deactivated_in_use: u64,
    pub adopted: u64,
}

/// `source=test` : les mairies de sept départements. Sinon : France entière (aires de covoiturage de la
/// base nationale, mairies, points propres à Liane).
pub async fn generate(db: &PgPool, test_only: bool) -> Result<SyncReport> {
    info!("generating rallying points...");

    let (sources, points) = if test_only {
        let town_halls = load_mairies()?
            .into_iter()
            .filter(|p| TEST_DEPARTMENTS.iter().any(|code| p.zip_code.starts_with(code)))
            .collect();
        (vec![TOWN_HALLS], town_halls)
    } else {
        let zipcodes = load_zipcodes()?;
        let mut all = load_bnlc(&zipcodes)?;
        all.extend(load_mairies()?);
        all.extend(load_custom());
        (vec![BNLC, TOWN_HALLS, CUSTOM], all)
    };

    info!("clustering {} raw points...", points.len());
    let report = sync(db, &sources, cluster(points)).await?;
    info!("rallying points generated: {report:?}");
    Ok(report)
}

/// Aligne les points de ralliement des `sources` sur `points`, par clé stable : crée les nouveaux, met à
/// jour ceux qui ont changé, réactive ceux qui reviennent, désactive ceux qui ont disparu. Rien n'est
/// supprimé et aucun identifiant ne change : lianes, trajets et demandes gardent leurs arrêts.
/// Les points des autres sources et les points sans clé ne sont pas touchés.
pub async fn sync(db: &PgPool, sources: &[&str], points: Vec<SourcePoint>) -> Result<SyncReport> {
    let mut tx = db.begin().await?;

    sqlx::query(
        r#"
            CREATE TEMPORARY TABLE source_point (
                source_key  VARCHAR(80) PRIMARY KEY,
                label       VARCHAR(255) NOT NULL,
                location    GEOGRAPHY(Point, 4326) NOT NULL,
                kind        VARCHAR(50) NOT NULL,
                address     TEXT NOT NULL,
                zip_code    VARCHAR(10) NOT NULL,
                city        VARCHAR(100) NOT NULL,
                place_count INTEGER
            ) ON COMMIT DROP
        "#,
    )
    .execute(&mut *tx)
    .await?;

    for chunk in points.chunks(5_000) {
        sqlx::query(
            r#"
                INSERT INTO source_point (source_key, label, location, kind, address, zip_code, city, place_count)
                SELECT key, left(label, 255), ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, kind,
                       address, left(zip_code, 10), left(city, 100), place_count
                FROM UNNEST($1::varchar[], $2::text[], $3::float8[], $4::float8[], $5::varchar[], $6::text[], $7::text[], $8::text[], $9::int4[])
                    AS p(key, label, lat, lng, kind, address, zip_code, city, place_count)
                ON CONFLICT (source_key) DO NOTHING
            "#,
        )
        .bind(chunk.iter().map(|p| p.source_key.clone()).collect::<Vec<_>>())
        .bind(chunk.iter().map(|p| p.label.clone()).collect::<Vec<_>>())
        .bind(chunk.iter().map(|p| p.lat).collect::<Vec<_>>())
        .bind(chunk.iter().map(|p| p.lng).collect::<Vec<_>>())
        .bind(chunk.iter().map(|p| p.kind.clone()).collect::<Vec<_>>())
        .bind(chunk.iter().map(|p| p.address.clone()).collect::<Vec<_>>())
        .bind(chunk.iter().map(|p| p.zip_code.clone()).collect::<Vec<_>>())
        .bind(chunk.iter().map(|p| p.city.clone()).collect::<Vec<_>>())
        .bind(chunk.iter().map(|p| p.place_count).collect::<Vec<_>>())
        .execute(&mut *tx)
        .await?;
    }

    let adopted = sqlx::query(
        r#"
            UPDATE rallying_point rp
            SET source_key = match.source_key
            FROM (
                SELECT DISTINCT ON (s.source_key) s.source_key, old.id
                FROM source_point s
                INNER JOIN rallying_point old
                    ON old.source_key IS NULL
                   AND old.kind = s.kind
                   AND old.label = s.label
                   AND ST_DWithin(old.location, s.location, 5)
                WHERE NOT EXISTS (SELECT 1 FROM rallying_point keyed WHERE keyed.source_key = s.source_key)
                ORDER BY s.source_key, old.is_active DESC, old.id
            ) match
            WHERE rp.id = match.id
        "#,
    )
    .execute(&mut *tx)
    .await?
    .rows_affected();

    let reactivated = sqlx::query(
        r#"
            UPDATE rallying_point rp
            SET is_active = true
            FROM source_point s
            WHERE rp.source_key = s.source_key AND NOT rp.is_active
        "#,
    )
    .execute(&mut *tx)
    .await?
    .rows_affected();

    let updated = sqlx::query(
        r#"
            UPDATE rallying_point rp
            SET label = s.label,
                location = s.location,
                kind = s.kind,
                address = s.address,
                zip_code = s.zip_code,
                city = s.city,
                place_count = s.place_count
            FROM source_point s
            WHERE rp.source_key = s.source_key
              AND (rp.label, rp.kind, rp.address, rp.zip_code, rp.city, rp.place_count, ST_AsEWKB(rp.location::geometry))
                  IS DISTINCT FROM
                  (s.label, s.kind, s.address, s.zip_code, s.city, s.place_count, ST_AsEWKB(s.location::geometry))
        "#,
    )
    .execute(&mut *tx)
    .await?
    .rows_affected();

    let inserted = sqlx::query(
        r#"
            INSERT INTO rallying_point (source_key, label, location, kind, address, zip_code, city, place_count, is_active)
            SELECT s.source_key, s.label, s.location, s.kind, s.address, s.zip_code, s.city, s.place_count, true
            FROM source_point s
            WHERE NOT EXISTS (SELECT 1 FROM rallying_point rp WHERE rp.source_key = s.source_key)
        "#,
    )
    .execute(&mut *tx)
    .await?
    .rows_affected();

    let deactivated: Vec<bool> = sqlx::query_scalar(
        r#"
            UPDATE rallying_point rp
            SET is_active = false
            WHERE rp.is_active
              AND split_part(rp.source_key, ':', 1) = ANY($1)
              AND NOT EXISTS (SELECT 1 FROM source_point s WHERE s.source_key = rp.source_key)
            RETURNING
                EXISTS (SELECT 1 FROM liane_stop ls WHERE ls.rallying_point_id = rp.id)
                OR EXISTS (SELECT 1 FROM trip t WHERE rp.id IN (t.from_rp_id, t.to_rp_id))
                OR EXISTS (SELECT 1 FROM trip_member tm WHERE rp.id IN (tm.from_rp_id, tm.to_rp_id))
                OR EXISTS (SELECT 1 FROM liane_request lr WHERE rp.id = ANY(lr.waypoints))
        "#,
    )
    .bind(sources.iter().map(|source| source.to_string()).collect::<Vec<_>>())
    .fetch_all(&mut *tx)
    .await?;

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM source_point")
        .fetch_one(&mut *tx)
        .await?;

    tx.commit().await?;

    Ok(SyncReport {
        count: count as u64,
        inserted,
        updated,
        reactivated,
        deactivated: deactivated.len() as u64,
        deactivated_in_use: deactivated.iter().filter(|in_use| **in_use).count() as u64,
        adopted,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn point(key: &str, lat: f64, lng: f64) -> SourcePoint {
        SourcePoint {
            source_key: key.to_string(),
            label: key.to_string(),
            lat,
            lng,
            kind: RallyingPointKind::TownHall,
            address: String::new(),
            zip_code: String::new(),
            city: String::new(),
            place_count: None,
        }
    }

    fn keys(points: &[SourcePoint]) -> Vec<&str> {
        let mut keys: Vec<&str> = points.iter().map(|p| p.source_key.as_str()).collect();
        keys.sort();
        keys
    }

    #[test]
    fn close_points_are_merged_and_the_easternmost_is_kept() {
        let kept = cluster(vec![
            point("west", 44.5, 3.5000),
            point("east", 44.5, 3.5020),
            point("far", 44.5, 3.6),
        ]);
        assert_eq!(keys(&kept), ["east", "far"]);
    }

    #[test]
    fn clustering_does_not_depend_on_input_order_and_ignores_invalid_coordinates() {
        let points = vec![
            point("a", 44.5, 3.5),
            point("b", 44.5, 3.5),
            point("c", 44.5031, 3.5),
            point("nan", f64::NAN, 3.5),
            point("d", 45.0, 3.5),
        ];
        let mut reversed = points.clone();
        reversed.reverse();
        let kept = cluster(points);
        assert_eq!(keys(&kept), keys(&cluster(reversed)));
        assert_eq!(keys(&kept), ["c", "d"]);
    }

    #[test]
    fn embedded_sources_have_unique_keys_and_the_test_set_keeps_its_size() {
        let town_halls = load_mairies().unwrap();
        let test_set: Vec<SourcePoint> = town_halls
            .iter()
            .filter(|p| TEST_DEPARTMENTS.iter().any(|code| p.zip_code.starts_with(code)))
            .cloned()
            .collect();
        assert_eq!(cluster(test_set).len(), 2022);

        let mut all = load_bnlc(&load_zipcodes().unwrap()).unwrap();
        all.extend(town_halls);
        all.extend(load_custom());
        let total = all.len();
        let distinct: std::collections::HashSet<&str> =
            all.iter().map(|p| p.source_key.as_str()).collect();
        assert_eq!(distinct.len(), total);
        assert!(all.iter().all(|p| p.source_key.len() <= 80));
    }
}
