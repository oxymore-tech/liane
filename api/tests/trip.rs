//! Tests d'intégration des trajets datés et de leur preuve, contre une vraie base PostgreSQL + PostGIS.
//! Ignorés par défaut : ils exigent `TEST_DATABASE_URL`.

mod common;

use chrono::{Duration, Utc};
use common::{Point, TestApp, unique_name};
use reqwest::StatusCode;
use serde_json::{Value, json};

fn in_minutes(minutes: i64) -> String {
    (Utc::now() + Duration::minutes(minutes)).to_rfc3339()
}

fn trip_input(minutes: i64, direction: &str, seat_count: i32) -> Value {
    json!({ "departure_time": in_minutes(minutes), "direction": direction, "seat_count": seat_count })
}

fn gesture_at(kind: &str, point: &Point) -> Value {
    json!({ "kind": kind, "position": { "lat": point.lat, "lng": point.lng, "accuracy_meters": 15.0 } })
}

fn gesture_without_position(kind: &str, status: &str) -> Value {
    json!({ "kind": kind, "position_status": status })
}

async fn propose(app: &TestApp, liane_id: &str, driver: &str, input: Value) -> Value {
    let (status, trip) = app
        .post(&format!("/liane/{liane_id}/trip"), Some(driver), input)
        .await;
    assert_eq!(status, StatusCode::OK, "{trip}");
    trip
}

async fn gesture(app: &TestApp, trip_id: &str, token: &str, body: Value) -> (StatusCode, Value) {
    app.post(&format!("/trip/{trip_id}/gesture"), Some(token), body)
        .await
}

async fn phone_of(app: &TestApp, user_id: &str) -> String {
    sqlx::query_scalar(r#"SELECT phone FROM "user" WHERE id = $1::uuid"#)
        .bind(user_id)
        .fetch_one(&app.db)
        .await
        .expect("téléphone")
}

fn passenger<'a>(trip: &'a Value, user_id: &str) -> &'a Value {
    trip["passengers"]
        .as_array()
        .expect("passagers")
        .iter()
        .find(|passenger| passenger["user"]["id"] == user_id)
        .expect("passager inscrit")
}

/// Une coordonnée relue en JSON peut différer de la dernière décimale.
fn is_close(value: &Value, expected: f64) -> bool {
    (value.as_f64().expect("nombre") - expected).abs() < 1e-9
}

fn has_id(list: &Value, id: &Value) -> bool {
    list.as_array()
        .expect("liste")
        .iter()
        .any(|item| &item["id"] == id)
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn a_driver_and_two_passengers_prove_their_trip_at_class_c_and_b() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let points = app.points(4).await;
    let (a, b, c, d) = (&points[0], &points[1], &points[2], &points[3]);
    let liane = app
        .create_liane(&admin, &unique_name("Trajets"), &[a, b, c, d])
        .await;
    let liane_id = liane["id"].as_str().unwrap();
    let distance_of = |index: usize| liane["stop_distances"][index].as_i64().unwrap();

    let (driver, driver_id) = app.new_member("Denis", liane_id, a, d).await;
    let (paula, paula_id) = app.new_member("Paula", liane_id, b, d).await;
    let (bob, bob_id) = app.new_member("Bob", liane_id, a, c).await;
    let (tom, _) = app.new_member("Tom", liane_id, a, d).await;
    let (outsider, _) = app.new_user("Olga").await;
    let driver_device = app.subscribe_device(&driver).await;
    let paula_device = app.subscribe_device(&paula).await;

    let trips_path = format!("/liane/{liane_id}/trip");
    let (status, _) = app.post(&trips_path, None, trip_input(10, "Outbound", 2)).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (status, _) = app
        .post(&trips_path, Some(&outsider), trip_input(10, "Outbound", 2))
        .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    for refused in [
        trip_input(10, "Outbound", 0),
        trip_input(10, "Outbound", 9),
        trip_input(-30, "Outbound", 2),
        trip_input(100 * 24 * 60, "Outbound", 2),
        json!({ "departure_time": in_minutes(10), "direction": "Outbound", "seat_count": 2,
                "from_stop_id": d.id, "to_stop_id": a.id }),
    ] {
        let (status, _) = app.post(&trips_path, Some(&driver), refused).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    let trip = propose(&app, liane_id, &driver, trip_input(10, "Outbound", 2)).await;
    let trip_id = trip["id"].as_str().unwrap();
    assert_eq!(trip["state"], "Planned");
    assert_eq!(trip["my_role"], "Driver");
    assert_eq!(trip["from_stop"]["id"], a.id.to_string());
    assert_eq!(trip["to_stop"]["id"], d.id.to_string());
    assert_eq!(trip["distance_meters"], distance_of(3));
    assert_eq!(trip["seats_left"], 2);
    assert_eq!(trip["next_gesture"], "Start");
    let announced = app.pushes.expect(&paula_device, "Nouveau trajet").await;
    assert!(announced.body.contains("Denis T. propose un trajet"));
    assert_eq!(announced.url, format!("/trajet/{trip_id}"));
    app.pushes.settle().await;
    assert!(app.pushes.sent_to(&driver_device).is_empty());

    let (status, upcoming) = app.get(&trips_path, Some(&paula)).await;
    assert_eq!(status, StatusCode::OK);
    assert!(has_id(&upcoming, &trip["id"]));
    assert!(upcoming[0]["my_role"].is_null());
    let (status, _) = app.get(&trips_path, Some(&outsider)).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = app.get(&trips_path, None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let trip_path = format!("/trip/{trip_id}");
    let (status, _) = app.get(&trip_path, Some(&outsider)).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = app.get(&trip_path, None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    let booking = format!("/trip/{trip_id}/passenger");
    let (status, _) = app.post(&booking, Some(&outsider), json!({})).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, refusal) = app.post(&booking, Some(&driver), json!({})).await;
    assert_eq!((status, refusal), (StatusCode::CONFLICT, json!("DriverCannotBook")));
    let (status, _) = app
        .post(&booking, Some(&bob), json!({ "from_stop_id": d.id, "to_stop_id": a.id }))
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let (status, booked) = app.call(reqwest::Method::POST, &booking, Some(&paula), None).await;
    assert_eq!(status, StatusCode::OK, "{booked}");
    assert_eq!(booked["my_role"], "Passenger");
    assert_eq!(passenger(&booked, &paula_id)["from_stop"]["id"], b.id.to_string());
    assert_eq!(passenger(&booked, &paula_id)["to_stop"]["id"], d.id.to_string());
    assert!(booked["next_gesture"] == "Start");
    let joined = app.pushes.expect(&driver_device, "Un passager de plus").await;
    assert!(joined.body.contains("Paula T. s'est inscrit"));

    let (status, booked) = app
        .post(&booking, Some(&bob), json!({ "from_stop_id": a.id, "to_stop_id": c.id }))
        .await;
    assert_eq!(status, StatusCode::OK, "{booked}");
    assert_eq!(booked["seats_left"], 0);
    let (status, refusal) = app.post(&booking, Some(&paula), json!({})).await;
    assert_eq!((status, refusal), (StatusCode::CONFLICT, json!("AlreadyBooked")));
    let (status, refusal) = app.post(&booking, Some(&tom), json!({})).await;
    assert_eq!((status, refusal), (StatusCode::CONFLICT, json!("TripFull")));

    // 0,30 €/km sur le tronçon du passager, divisé entre les trois occupants.
    let paula_distance = distance_of(3) - distance_of(1);
    let expected_cents = (paula_distance as f64 / 1000.0 * 30.0 / 3.0).round() as i64;
    assert_eq!(passenger(&booked, &paula_id)["distance_meters"], paula_distance);
    assert_eq!(
        passenger(&booked, &paula_id)["indicative_contribution_cents"],
        expected_cents
    );

    let (status, _) = gesture(&app, trip_id, &outsider, gesture_at("Start", a)).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = gesture(&app, trip_id, &tom, gesture_at("Start", a)).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, refusal) = gesture(&app, trip_id, &paula, gesture_at("End", d)).await;
    assert_eq!((status, refusal), (StatusCode::CONFLICT, json!("StartFirst")));
    let (status, _) = gesture(
        &app,
        trip_id,
        &driver,
        json!({ "kind": "Start", "position": { "lat": 95.0, "lng": 0.0 } }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let (status, started) = gesture(&app, trip_id, &driver, gesture_at("Start", a)).await;
    assert_eq!(status, StatusCode::OK, "{started}");
    assert_eq!(started["state"], "Started");
    assert_eq!(started["next_gesture"], "End");
    assert!(started["driver_started_at"].is_string());
    assert_eq!(started["my_gestures"][0]["position_status"], "Granted");
    assert!(!started.to_string().contains(&a.lat.to_string()));
    let departed = app.pushes.expect(&paula_device, "Denis T. est parti").await;
    assert!(departed.body.contains("Je suis monté"));

    let (status, refusal) = gesture(&app, trip_id, &driver, gesture_at("Start", a)).await;
    assert_eq!((status, refusal), (StatusCode::CONFLICT, json!("AlreadyDone")));
    let (status, refusal) = app.delete(&trip_path, Some(&driver)).await;
    assert_eq!((status, refusal), (StatusCode::CONFLICT, json!("TripAlreadyStarted")));
    let (status, refusal) = app.post(&booking, Some(&tom), json!({})).await;
    assert_eq!((status, refusal), (StatusCode::CONFLICT, json!("TripClosed")));

    let (status, boarded) = gesture(&app, trip_id, &paula, gesture_at("Start", b)).await;
    assert_eq!(status, StatusCode::OK, "{boarded}");
    assert_eq!(boarded["state"], "Started");
    assert!(passenger(&boarded, &paula_id)["started_at"].is_string());
    let (status, refusal) = app.delete(&booking, Some(&paula)).await;
    assert_eq!((status, refusal), (StatusCode::CONFLICT, json!("AlreadyOnBoard")));

    // Bob refuse de donner sa position en montant : son geste est accepté quand même.
    let (status, boarded) = gesture(
        &app,
        trip_id,
        &bob,
        gesture_without_position("Start", "Denied"),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{boarded}");
    assert_eq!(boarded["my_gestures"][0]["position_status"], "Denied");

    let (status, _) = gesture(&app, trip_id, &bob, gesture_at("End", c)).await;
    assert_eq!(status, StatusCode::OK);
    let (status, finished) = gesture(&app, trip_id, &driver, gesture_at("End", d)).await;
    assert_eq!(status, StatusCode::OK, "{finished}");
    assert_eq!(finished["state"], "Finished");
    assert_eq!(finished["is_open"], false);
    assert!(finished["next_gesture"].is_null());
    app.pushes.expect(&paula_device, "Denis T. est arrivé").await;

    // Un passager peut encore déclarer sa descente après l'arrivée du conducteur.
    let (status, arrived) = gesture(&app, trip_id, &paula, gesture_at("End", d)).await;
    assert_eq!(status, StatusCode::OK, "{arrived}");
    assert_eq!(passenger(&arrived, &paula_id)["attestation"], "Full");
    assert!(passenger(&arrived, &bob_id)["attestation"].is_null());
    assert!(arrived["next_gesture"].is_null());

    let (_, seen_by_driver) = app.get(&trip_path, Some(&driver)).await;
    assert_eq!(passenger(&seen_by_driver, &paula_id)["attestation"], "Full");
    assert_eq!(passenger(&seen_by_driver, &bob_id)["attestation"], "Partial");
    let (_, seen_by_bob) = app.get(&trip_path, Some(&bob)).await;
    assert_eq!(passenger(&seen_by_bob, &bob_id)["attestation"], "Partial");
    let (_, seen_by_tom) = app.get(&trip_path, Some(&tom)).await;
    assert!(passenger(&seen_by_tom, &paula_id)["attestation"].is_null());

    let driver_phone = phone_of(&app, &driver_id).await;
    let paula_phone = phone_of(&app, &paula_id).await;
    for seen in [&seen_by_driver, &seen_by_bob, &seen_by_tom] {
        let text = seen.to_string();
        assert!(!text.contains(&driver_phone) && !text.contains(&paula_phone));
        assert!(!text.contains("proof_class") && !text.contains("\"lat\""));
    }

    let (_, mine) = app.get("/trip/mine", Some(&paula)).await;
    assert!(has_id(&mine["past"], &trip["id"]));
    assert!(!has_id(&mine["upcoming"], &trip["id"]));
    let (_, upcoming) = app.get(&trips_path, Some(&paula)).await;
    assert!(!has_id(&upcoming, &trip["id"]));

    let (status, _) = app.get("/trip/admin", Some(&driver)).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = app.get("/trip/admin/export", Some(&driver)).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = app.get("/trip/admin/export", None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    let (status, all) = app.get("/trip/admin", Some(&admin)).await;
    assert_eq!(status, StatusCode::OK);
    let listed = all
        .as_array()
        .unwrap()
        .iter()
        .find(|item| item["id"] == trip["id"])
        .expect("trajet dans la liste d'administration");
    let proof_of = |user_id: &str| {
        listed["proofs"]
            .as_array()
            .unwrap()
            .iter()
            .find(|proof| proof["passenger"]["id"] == user_id)
            .expect("preuve du passager")
    };
    assert_eq!(proof_of(&paula_id)["proof_class"], "C");
    assert_eq!(proof_of(&paula_id)["proof_detail"]["driver"]["attested"], true);
    assert_eq!(proof_of(&paula_id)["proof_detail"]["passenger"]["attested"], true);
    assert_eq!(proof_of(&bob_id)["proof_class"], "B");
    let bob_detail = &proof_of(&bob_id)["proof_detail"];
    assert_eq!(bob_detail["passenger"]["attested"], false);
    assert_eq!(bob_detail["passenger"]["start"]["position_status"], "Denied");
    assert_eq!(bob_detail["passenger"]["end"]["position_status"], "Granted");
    assert!(!listed.to_string().contains(&paula_phone));

    let (status, export) = app.get("/trip/admin/export", Some(&admin)).await;
    assert_eq!(status, StatusCode::OK);
    let journeys: Vec<&Value> = export
        .as_array()
        .unwrap()
        .iter()
        .filter(|journey| journey["operator_trip_id"] == trip["id"])
        .collect();
    assert_eq!(journeys.len(), 2);
    let journey = journeys
        .iter()
        .find(|journey| journey["passenger"]["identity"]["operator_user_id"] == paula_id)
        .expect("couple conducteur / Paula");
    assert_eq!(journey["operator_class"], "C");
    assert_eq!(journey["operator_journey_id"], format!("{trip_id}:{paula_id}"));
    assert_eq!(journey["driver"]["identity"]["phone"], driver_phone);
    assert_eq!(journey["passenger"]["identity"]["phone"], paula_phone);
    assert_eq!(journey["distance"], paula_distance);
    assert!(is_close(&journey["start"]["lat"], b.lat));
    assert!(is_close(&journey["start"]["lon"], b.lng));
    assert!(is_close(&journey["end"]["lat"], d.lat));
    assert!(journey["start"]["datetime"].is_string());
    assert!(is_close(&journey["driver"]["start"]["lat"], a.lat));
    assert!(is_close(&journey["driver"]["end"]["lon"], d.lng));
    assert!(journey["driver"]["revenue"].is_null());
    assert!(journey["passenger"]["contribution"].is_null());
    assert_eq!(journey["passenger"]["seats"], 1);
    assert_eq!(journey["liane"]["indicative_contribution_cents"], expected_cents);

    let (_, only_c) = app.get("/trip/admin/export?class=C", Some(&admin)).await;
    let classes: Vec<&Value> = only_c
        .as_array()
        .unwrap()
        .iter()
        .filter(|journey| journey["operator_trip_id"] == trip["id"])
        .map(|journey| &journey["operator_class"])
        .collect();
    assert_eq!(classes, [&json!("C")]);
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn gestures_are_refused_outside_the_time_window_and_on_canceled_trips() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let points = app.points(3).await;
    let (a, b, c) = (&points[0], &points[1], &points[2]);
    let liane = app
        .create_liane(&admin, &unique_name("Fenêtres"), &[a, b, c])
        .await;
    let liane_id = liane["id"].as_str().unwrap();
    let (driver, _) = app.new_member("Diane", liane_id, a, c).await;
    let (rider, rider_id) = app.new_member("Rémi", liane_id, a, c).await;
    let rider_device = app.subscribe_device(&rider).await;
    let driver_device = app.subscribe_device(&driver).await;

    // Trop tôt : le trajet est demain.
    let tomorrow = propose(&app, liane_id, &driver, trip_input(24 * 60, "Outbound", 3)).await;
    let tomorrow_id = tomorrow["id"].as_str().unwrap();
    assert!(tomorrow["next_gesture"].is_null());
    let (status, refusal) = gesture(&app, tomorrow_id, &driver, gesture_at("Start", a)).await;
    assert_eq!((status, refusal), (StatusCode::CONFLICT, json!("TooEarly")));

    // Inscription puis désinscription : la place est rendue, le conducteur est prévenu.
    let booking = format!("/trip/{tomorrow_id}/passenger");
    let (status, booked) = app.post(&booking, Some(&rider), json!({})).await;
    assert_eq!(status, StatusCode::OK, "{booked}");
    assert_eq!(booked["seats_left"], 2);
    let (_, mine) = app.get("/trip/mine", Some(&rider)).await;
    assert!(has_id(&mine["upcoming"], &tomorrow["id"]));
    let (status, left) = app.delete(&booking, Some(&rider)).await;
    assert_eq!(status, StatusCode::OK, "{left}");
    assert_eq!(left["seats_left"], 3);
    assert!(left["my_role"].is_null());
    app.pushes.expect(&driver_device, "Un passager en moins").await;
    let (status, _) = app.delete(&booking, Some(&rider)).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let (status, refusal) = gesture(&app, tomorrow_id, &rider, gesture_at("Start", a)).await;
    assert_eq!(status, StatusCode::FORBIDDEN, "{refusal}");

    // Trop tard : quatre heures après l'heure prévue, plus de départ ni d'inscription.
    let (status, _) = app.post(&booking, Some(&rider), json!({})).await;
    assert_eq!(status, StatusCode::OK);
    sqlx::query("UPDATE trip SET departure_time = NOW() - INTERVAL '4 hours' WHERE id = $1::uuid")
        .bind(tomorrow_id)
        .execute(&app.db)
        .await
        .unwrap();
    let (status, refusal) = gesture(&app, tomorrow_id, &driver, gesture_at("Start", a)).await;
    assert_eq!((status, refusal), (StatusCode::CONFLICT, json!("TooLate")));
    let (status, refusal) = gesture(&app, tomorrow_id, &rider, gesture_at("Start", a)).await;
    assert_eq!((status, refusal), (StatusCode::CONFLICT, json!("TooLate")));
    let (_, stale) = app.get(&format!("/trip/{tomorrow_id}"), Some(&rider)).await;
    assert_eq!(stale["is_open"], false);
    let (_, mine) = app.get("/trip/mine", Some(&rider)).await;
    assert!(has_id(&mine["past"], &tomorrow["id"]));
    let (_, upcoming) = app.get(&format!("/liane/{liane_id}/trip"), Some(&rider)).await;
    assert!(!has_id(&upcoming, &tomorrow["id"]));

    // Arrivée trop tardive : treize heures après l'heure prévue.
    let late = propose(&app, liane_id, &driver, trip_input(5, "Outbound", 3)).await;
    let late_id = late["id"].as_str().unwrap();
    let (status, _) = gesture(&app, late_id, &driver, gesture_at("Start", a)).await;
    assert_eq!(status, StatusCode::OK);
    sqlx::query("UPDATE trip SET departure_time = NOW() - INTERVAL '13 hours' WHERE id = $1::uuid")
        .bind(late_id)
        .execute(&app.db)
        .await
        .unwrap();
    let (status, refusal) = gesture(&app, late_id, &driver, gesture_at("End", c)).await;
    assert_eq!((status, refusal), (StatusCode::CONFLICT, json!("TooLate")));

    // Annulation par le conducteur : les inscrits sont prévenus, plus rien n'est accepté.
    let canceled = propose(&app, liane_id, &driver, trip_input(10, "Outbound", 3)).await;
    let canceled_id = canceled["id"].as_str().unwrap();
    let canceled_path = format!("/trip/{canceled_id}");
    let booking = format!("{canceled_path}/passenger");
    let (status, _) = app.post(&booking, Some(&rider), json!({})).await;
    assert_eq!(status, StatusCode::OK);
    let (status, _) = app.delete(&canceled_path, Some(&rider)).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, after) = app.delete(&canceled_path, Some(&driver)).await;
    assert_eq!(status, StatusCode::OK, "{after}");
    assert_eq!(after["state"], "Canceled");
    assert!(after["next_gesture"].is_null());
    let warned = app.pushes.expect(&rider_device, "Trajet annulé").await;
    assert!(warned.body.contains("Diane T. a annulé le trajet"));

    let (status, refusal) = app.delete(&canceled_path, Some(&driver)).await;
    assert_eq!((status, refusal), (StatusCode::CONFLICT, json!("TripCanceled")));
    for token in [&driver, &rider] {
        let (status, refusal) = gesture(&app, canceled_id, token, gesture_at("Start", a)).await;
        assert_eq!((status, refusal), (StatusCode::CONFLICT, json!("TripCanceled")));
    }
    let (status, refusal) = app.delete(&booking, Some(&rider)).await;
    assert_eq!((status, refusal), (StatusCode::CONFLICT, json!("TripCanceled")));
    let (tom, _) = app.new_member("Tom", liane_id, a, c).await;
    let (status, refusal) = app.post(&booking, Some(&tom), json!({})).await;
    assert_eq!((status, refusal), (StatusCode::CONFLICT, json!("TripCanceled")));
    let (_, mine) = app.get("/trip/mine", Some(&rider)).await;
    assert!(has_id(&mine["past"], &canceled["id"]));

    let (_, export) = app.get("/trip/admin/export", Some(&admin)).await;
    assert!(
        !export
            .as_array()
            .unwrap()
            .iter()
            .any(|journey| journey["passenger"]["identity"]["operator_user_id"] == rider_id),
        "ni un trajet annulé ni un trajet sans aucun geste ne sont exportés"
    );
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn positions_are_optional_and_checked_for_plausibility_without_blocking() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let points = app.points(4).await;
    let (a, b, c, d) = (&points[0], &points[1], &points[2], &points[3]);
    let liane = app
        .create_liane(&admin, &unique_name("Retour"), &[a, b, c, d])
        .await;
    let liane_id = liane["id"].as_str().unwrap();
    let (driver, _) = app.new_member("Dora", liane_id, a, d).await;
    let (rider, rider_id) = app.new_member("Rose", liane_id, b, c).await;

    // Trajet retour : le tronçon habituel de chacun est pris dans l'autre sens.
    let trip = propose(&app, liane_id, &driver, trip_input(5, "Return", 1)).await;
    let trip_id = trip["id"].as_str().unwrap();
    assert_eq!(trip["from_stop"]["id"], d.id.to_string());
    assert_eq!(trip["to_stop"]["id"], a.id.to_string());
    let booking = format!("/trip/{trip_id}/passenger");
    let (status, _) = app
        .post(&booking, Some(&rider), json!({ "from_stop_id": b.id, "to_stop_id": c.id }))
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    let (status, booked) = app.post(&booking, Some(&rider), json!({})).await;
    assert_eq!(status, StatusCode::OK, "{booked}");
    assert_eq!(passenger(&booked, &rider_id)["from_stop"]["id"], c.id.to_string());
    assert_eq!(passenger(&booked, &rider_id)["to_stop"]["id"], b.id.to_string());

    // La conductrice déclare son départ à 11 km de l'arrêt prévu, puis son arrivée sans position.
    let (status, started) = gesture(&app, trip_id, &driver, gesture_at("Start", c)).await;
    assert_eq!(status, StatusCode::OK, "{started}");
    let (status, _) = gesture(
        &app,
        trip_id,
        &rider,
        gesture_without_position("Start", "Unavailable"),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let (status, _) = gesture(&app, trip_id, &rider, json!({ "kind": "End" })).await;
    assert_eq!(status, StatusCode::OK);
    let (status, finished) = gesture(
        &app,
        trip_id,
        &driver,
        gesture_without_position("End", "Denied"),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{finished}");
    assert_eq!(passenger(&finished, &rider_id)["attestation"], "None");

    let (_, all) = app.get("/trip/admin", Some(&admin)).await;
    let listed = all
        .as_array()
        .unwrap()
        .iter()
        .find(|item| item["id"] == trip["id"])
        .unwrap();
    let proof = &listed["proofs"][0];
    assert_eq!(proof["proof_class"], "A");
    let detail = &proof["proof_detail"];
    assert_eq!(detail["connection"]["attested"], true);
    assert_eq!(detail["driver"]["attested"], false);
    assert_eq!(detail["driver"]["start"]["far_from_stop"], true);
    assert!(detail["driver"]["start"]["distance_to_stop_meters"].as_i64().unwrap() > 5_000);
    assert_eq!(detail["driver"]["end"]["position_status"], "Denied");
    assert_eq!(detail["passenger"]["start"]["position_status"], "Unavailable");
    let warnings = detail["warnings"].as_array().unwrap();
    assert!(warnings.contains(&json!("DriverStartFarFromStop")));
    assert!(warnings.contains(&json!("PassengerTripTooShort")));

    let (_, export) = app.get("/trip/admin/export?class=A", Some(&admin)).await;
    let journey = export
        .as_array()
        .unwrap()
        .iter()
        .find(|journey| journey["operator_trip_id"] == trip["id"])
        .expect("couple de classe A exporté");
    assert!(journey["start"]["lat"].is_null());
    assert!(journey["start"]["datetime"].is_string());
    assert!(is_close(&journey["driver"]["start"]["lat"], c.lat));
    assert!(journey["driver"]["end"]["lat"].is_null());
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn leaving_a_liane_cancels_planned_trips_and_bookings() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let points = app.points(2).await;
    let (a, b) = (&points[0], &points[1]);
    let liane = app.create_liane(&admin, &unique_name("Départ"), &[a, b]).await;
    let liane_id = liane["id"].as_str().unwrap();
    let (driver, _) = app.new_member("Dan", liane_id, a, b).await;
    let (rider, rider_id) = app.new_member("Rita", liane_id, a, b).await;
    let (other, _) = app.new_member("Omar", liane_id, a, b).await;
    let rider_device = app.subscribe_device(&rider).await;

    let driven = propose(&app, liane_id, &driver, trip_input(60, "Outbound", 3)).await;
    let other_trip = propose(&app, liane_id, &other, trip_input(90, "Outbound", 3)).await;
    for trip in [&driven, &other_trip] {
        let booking = format!("/trip/{}/passenger", trip["id"].as_str().unwrap());
        let (status, _) = app.post(&booking, Some(&rider), json!({})).await;
        assert_eq!(status, StatusCode::OK);
    }

    // Le conducteur quitte la liane : son trajet est annulé, la passagère prévenue.
    let (status, _) = app
        .delete(&format!("/liane/{liane_id}/membership"), Some(&driver))
        .await;
    assert_eq!(status, StatusCode::OK);
    let (_, after) = app
        .get(&format!("/trip/{}", driven["id"].as_str().unwrap()), Some(&rider))
        .await;
    assert_eq!(after["state"], "Canceled");
    app.pushes.expect(&rider_device, "Trajet annulé").await;

    // La passagère est exclue : son inscription à l'autre trajet est retirée.
    let (status, _) = app
        .delete(&format!("/liane/{liane_id}/member/{rider_id}"), Some(&admin))
        .await;
    assert_eq!(status, StatusCode::OK);
    let (_, after) = app
        .get(&format!("/trip/{}", other_trip["id"].as_str().unwrap()), Some(&other))
        .await;
    assert_eq!(after["state"], "Planned");
    assert_eq!(after["seats_left"], 3);
    assert_eq!(after["passengers"], json!([]));

    // Une liane qui a des trajets ne se supprime pas : on la désactive.
    let (status, _) = app.delete(&format!("/liane/{liane_id}"), Some(&admin)).await;
    assert_eq!(status, StatusCode::CONFLICT);
}
