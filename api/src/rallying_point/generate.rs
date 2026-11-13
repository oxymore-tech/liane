use std::collections::HashMap;

use serde::Deserialize;
use sqlx::PgPool;
use tracing::info;

use crate::error::Result;
use crate::rallying_point::model::RallyingPointKind;

const MIN_DISTANCE_METERS: f64 = 375.0;
const EARTH_RADIUS_METERS: f64 = 6_371_000.0;

struct RawPoint {
    label: String,
    lat: f64,
    lng: f64,
    kind: RallyingPointKind,
    address: String,
    zip_code: String,
    city: String,
    place_count: Option<i32>,
}

#[derive(Deserialize)]
struct BnlcEntry {
    #[allow(dead_code)]
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
        let entry = result.map_err(|e| crate::error::AppError::unexpected(e))?;
        map.entry(entry.insee).or_insert(entry.zipcode);
    }
    Ok(map)
}

fn load_bnlc(zipcodes: &HashMap<String, String>) -> Result<Vec<RawPoint>> {
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

        points.push(RawPoint {
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

fn load_mairies() -> Result<Vec<RawPoint>> {
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

        points.push(RawPoint {
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

fn load_custom() -> Vec<RawPoint> {
    vec![
        RawPoint {
            label: "Living Objects".into(),
            lat: 43.567936,
            lng: 1.390924,
            kind: RallyingPointKind::Parking,
            address: "1 impasse Marcel Chalard".into(),
            zip_code: "31000".into(),
            city: "Toulouse".into(),
            place_count: Some(10),
        },
        RawPoint {
            label: "Michel Labrousse".into(),
            lat: 43.568356,
            lng: 1.386925,
            kind: RallyingPointKind::Parking,
            address: "11 rue Michel Labrousse".into(),
            zip_code: "31000".into(),
            city: "Toulouse".into(),
            place_count: None,
        },
        RawPoint {
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

fn cluster(mut points: Vec<RawPoint>) -> Vec<RawPoint> {
    points.sort_by(|a, b| a.lng.partial_cmp(&b.lng).unwrap());

    let mut result: Vec<RawPoint> = Vec::new();
    let mut used = vec![false; points.len()];

    for i in (0..points.len()).rev() {
        if used[i] {
            continue;
        }
        used[i] = true;

        let mut group = vec![i];
        for j in (0..i).rev() {
            if used[j] {
                continue;
            }
            if (points[i].lng - points[j].lng).abs() > 0.01 {
                break;
            }
            if haversine(points[i].lat, points[i].lng, points[j].lat, points[j].lng)
                <= MIN_DISTANCE_METERS
            {
                let dominated = group.iter().all(|&k| {
                    haversine(points[j].lat, points[j].lng, points[k].lat, points[k].lng)
                        <= MIN_DISTANCE_METERS
                });
                if dominated {
                    used[j] = true;
                } else {
                    group.push(j);
                    used[j] = true;
                }
            }
        }

        result.push(unsafe { std::ptr::read(&points[group[0]]) });
    }

    std::mem::forget(points);
    result
}

pub async fn generate(db: &PgPool, test_only: bool) -> Result<u64> {
    info!("generating rallying points...");

    let zipcodes = load_zipcodes()?;

    let mut points = if test_only {
        let mairies = load_mairies()?;
        mairies
            .into_iter()
            .filter(|p| {
                ["46", "31", "48", "09", "81", "82", "12"]
                    .iter()
                    .any(|code| p.zip_code.starts_with(code))
            })
            .collect()
    } else {
        info!("loading BNLC...");
        let mut all = load_bnlc(&zipcodes)?;
        info!("loading mairies...");
        all.extend(load_mairies()?);
        info!("loading custom points...");
        all.extend(load_custom());
        all
    };

    info!("clustering {} raw points...", points.len());
    points = cluster(points);
    let count = points.len() as u64;
    info!("inserting {count} points...");

    let mut tx = db.begin().await?;
    sqlx::query("DELETE FROM rallying_point")
        .execute(&mut *tx)
        .await?;

    for p in &points {
        sqlx::query(
            r#"
            INSERT INTO rallying_point (label, location, kind, address, zip_code, city, place_count, is_active)
            VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, $4, $5, $6, $7, $8, true)
            "#,
        )
        .bind(&p.label)
        .bind(p.lat)
        .bind(p.lng)
        .bind(&p.kind)
        .bind(&p.address)
        .bind(&p.zip_code)
        .bind(&p.city)
        .bind(p.place_count)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    info!("rallying points generated: {count}");
    Ok(count)
}
