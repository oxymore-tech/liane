//! Tracé routier d'une liane : OSRM quand il répond, sinon la ligne brisée entre les arrêts.

use std::sync::OnceLock;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tracing::warn;

const CONNECT_TIMEOUT: Duration = Duration::from_secs(2);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(4);
/// Au-delà, l'arrêt n'est pas sur le réseau routier connu d'OSRM (hors de la zone couverte) :
/// sans cette limite OSRM le rattacherait à la route la plus proche, même à 300 km.
const MAX_SNAP_METERS: u32 = 1_000;
const EARTH_RADIUS_METERS: f64 = 6_371_008.8;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "PascalCase")]
pub enum RouteSource {
    Osrm,
    Straight,
}

/// Coordonnées dans l'ordre GeoJSON : longitude, latitude.
pub type Position = [f64; 2];

#[derive(Debug, Clone, PartialEq)]
pub struct ComputedRoute {
    pub source: RouteSource,
    pub coordinates: Vec<Position>,
    pub distance_meters: i32,
    /// Inconnue pour un tracé en ligne droite.
    pub duration_seconds: Option<i32>,
    /// Distance cumulée de chaque arrêt depuis le premier, le long du tracé.
    pub stop_distances: Vec<i32>,
}

impl ComputedRoute {
    pub fn geojson(&self) -> serde_json::Value {
        serde_json::json!({ "type": "LineString", "coordinates": self.coordinates })
    }
}

#[derive(Debug, PartialEq)]
pub enum OsrmFailure {
    /// OSRM n'est pas configuré, injoignable, hors délai ou répond n'importe quoi.
    Unavailable(String),
    /// OSRM répond mais ne relie pas ces arrêts (hors de la zone couverte, par exemple).
    NoRoute(String),
}

/// Ne renvoie jamais d'erreur : sans réponse exploitable d'OSRM, le tracé est la ligne droite.
pub async fn compute(osrm_url: &str, stops: &[Position]) -> ComputedRoute {
    match osrm_route(osrm_url, stops).await {
        Ok(route) => route,
        Err(failure) => {
            warn!("OSRM route unavailable, falling back to straight line: {failure:?}");
            straight(stops)
        }
    }
}

pub async fn osrm_route(osrm_url: &str, stops: &[Position]) -> Result<ComputedRoute, OsrmFailure> {
    let base = osrm_url.trim().trim_end_matches('/');
    if base.is_empty() {
        return Err(OsrmFailure::Unavailable("OSRM_URL is not set".to_string()));
    }
    if stops.len() < 2 {
        return Err(OsrmFailure::NoRoute("less than two stops".to_string()));
    }

    let coordinates = stops
        .iter()
        .map(|[lng, lat]| format!("{lng:.6},{lat:.6}"))
        .collect::<Vec<_>>()
        .join(";");
    let radiuses = vec![MAX_SNAP_METERS.to_string(); stops.len()].join(";");
    let url = format!(
        "{base}/route/v1/driving/{coordinates}?overview=full&geometries=geojson&steps=false&continue_straight=false&radiuses={radiuses}"
    );

    let response = client()
        .get(&url)
        .send()
        .await
        .map_err(|err| OsrmFailure::Unavailable(err.to_string()))?;
    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|err| OsrmFailure::Unavailable(err.to_string()))?;
    parse_response(status.as_u16(), &body, stops.len())
}

/// Ligne brisée entre les arrêts, distances à vol d'oiseau, pas de durée.
pub fn straight(stops: &[Position]) -> ComputedRoute {
    let mut total = 0.0;
    let mut stop_distances = Vec::with_capacity(stops.len());
    for (index, stop) in stops.iter().enumerate() {
        if index > 0 {
            total += haversine_meters(&stops[index - 1], stop);
        }
        stop_distances.push(total.round() as i32);
    }
    ComputedRoute {
        source: RouteSource::Straight,
        coordinates: stops.to_vec(),
        distance_meters: total.round() as i32,
        duration_seconds: None,
        stop_distances,
    }
}

fn client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .connect_timeout(CONNECT_TIMEOUT)
            .timeout(REQUEST_TIMEOUT)
            .build()
            .unwrap_or_default()
    })
}

#[derive(Deserialize)]
struct OsrmResponse {
    code: String,
    #[serde(default)]
    message: Option<String>,
    #[serde(default)]
    routes: Vec<OsrmRoute>,
}

#[derive(Deserialize)]
struct OsrmRoute {
    distance: f64,
    duration: f64,
    geometry: OsrmGeometry,
    legs: Vec<OsrmLeg>,
}

#[derive(Deserialize)]
struct OsrmGeometry {
    coordinates: Vec<Position>,
}

#[derive(Deserialize)]
struct OsrmLeg {
    distance: f64,
}

fn parse_response(
    status: u16,
    body: &str,
    stop_count: usize,
) -> Result<ComputedRoute, OsrmFailure> {
    let Ok(response) = serde_json::from_str::<OsrmResponse>(body) else {
        return Err(OsrmFailure::Unavailable(format!(
            "HTTP {status}, unreadable body"
        )));
    };
    if response.code != "Ok" {
        let detail = format!(
            "{}: {}",
            response.code,
            response.message.unwrap_or_default()
        );
        // NoRoute, NoSegment : la demande est comprise mais ces points ne sont pas reliés.
        return Err(match response.code.as_str() {
            "NoRoute" | "NoSegment" => OsrmFailure::NoRoute(detail),
            _ => OsrmFailure::Unavailable(detail),
        });
    }
    let Some(route) = response.routes.into_iter().next() else {
        return Err(OsrmFailure::NoRoute("no route in response".to_string()));
    };
    if route.geometry.coordinates.len() < 2 || route.legs.len() + 1 != stop_count {
        return Err(OsrmFailure::Unavailable(
            "unexpected route shape".to_string(),
        ));
    }

    let mut total = 0.0;
    let mut stop_distances = vec![0];
    for leg in &route.legs {
        total += leg.distance;
        stop_distances.push(total.round() as i32);
    }
    Ok(ComputedRoute {
        source: RouteSource::Osrm,
        coordinates: route.geometry.coordinates,
        distance_meters: route.distance.round() as i32,
        duration_seconds: Some(route.duration.round() as i32),
        stop_distances,
    })
}

fn haversine_meters(from: &Position, to: &Position) -> f64 {
    let (lat1, lat2) = (from[1].to_radians(), to[1].to_radians());
    let delta_lat = lat2 - lat1;
    let delta_lng = (to[0] - from[0]).to_radians();
    let a =
        (delta_lat / 2.0).sin().powi(2) + lat1.cos() * lat2.cos() * (delta_lng / 2.0).sin().powi(2);
    2.0 * EARTH_RADIUS_METERS * a.sqrt().asin()
}

#[cfg(test)]
mod tests {
    use super::{OsrmFailure, RouteSource, compute, parse_response, straight};

    const FLORAC: [f64; 2] = [3.5933, 44.3256];
    const MENDE: [f64; 2] = [3.4990, 44.5180];

    #[test]
    fn straight_route_joins_stops_with_cumulative_distances() {
        let route = straight(&[FLORAC, MENDE, FLORAC]);
        assert_eq!(route.source, RouteSource::Straight);
        assert_eq!(route.coordinates, vec![FLORAC, MENDE, FLORAC]);
        assert_eq!(route.duration_seconds, None);
        assert_eq!(route.stop_distances[0], 0);
        // Florac – Mende à vol d'oiseau : environ 22,7 km.
        assert!((22_000..23_500).contains(&route.stop_distances[1]));
        assert_eq!(route.stop_distances[2], route.distance_meters);
        assert!((route.distance_meters - 2 * route.stop_distances[1]).abs() <= 1);
    }

    #[test]
    fn osrm_response_gives_geometry_totals_and_cumulative_leg_distances() {
        let body = r#"{
            "code": "Ok",
            "routes": [{
                "distance": 3000.4,
                "duration": 240.6,
                "geometry": { "type": "LineString", "coordinates": [[3.5, 44.3], [3.51, 44.35], [3.5, 44.4], [3.49, 44.5]] },
                "legs": [{ "distance": 1000.4, "duration": 80 }, { "distance": 2000.0, "duration": 160.6 }]
            }],
            "waypoints": []
        }"#;
        let route = parse_response(200, body, 3).unwrap();
        assert_eq!(route.source, RouteSource::Osrm);
        assert_eq!(route.coordinates.len(), 4);
        assert_eq!(route.distance_meters, 3000);
        assert_eq!(route.duration_seconds, Some(241));
        assert_eq!(route.stop_distances, vec![0, 1000, 3000]);
    }

    #[test]
    fn osrm_errors_are_told_apart() {
        let no_route = r#"{"code":"NoRoute","message":"Impossible route between points"}"#;
        assert!(matches!(
            parse_response(400, no_route, 2),
            Err(OsrmFailure::NoRoute(_))
        ));
        let no_segment = r#"{"code":"NoSegment","message":"Could not find a matching segment"}"#;
        assert!(matches!(
            parse_response(400, no_segment, 2),
            Err(OsrmFailure::NoRoute(_))
        ));
        assert!(matches!(
            parse_response(502, "<html>Bad Gateway</html>", 2),
            Err(OsrmFailure::Unavailable(_))
        ));
        let wrong_legs = r#"{"code":"Ok","routes":[{"distance":1,"duration":1,
            "geometry":{"coordinates":[[0,0],[1,1]]},"legs":[{"distance":1}]}]}"#;
        assert!(matches!(
            parse_response(200, wrong_legs, 3),
            Err(OsrmFailure::Unavailable(_))
        ));
    }

    #[tokio::test]
    async fn without_osrm_the_route_is_straight() {
        for url in ["", "http://127.0.0.1:1", "not a url"] {
            let route = compute(url, &[FLORAC, MENDE]).await;
            assert_eq!(route.source, RouteSource::Straight, "{url}");
            assert_eq!(route.coordinates, vec![FLORAC, MENDE]);
        }
    }
}
