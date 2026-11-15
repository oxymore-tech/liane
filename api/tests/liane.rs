//! Tests d'intégration du parcours « lianes » contre une vraie base PostgreSQL + PostGIS.
//! Ignorés par défaut : ils exigent `TEST_DATABASE_URL`.

mod common;

use common::{TestApp, contains_id, membership, tile_of, unique_name};
use reqwest::StatusCode;
use serde_json::json;

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn admin_creates_visitor_sees_user_joins_a_section_then_leaves() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let points = app.points(5).await;
    let (a, b, c, d, outside) = (&points[0], &points[1], &points[2], &points[3], &points[4]);

    let name = unique_name("Ligne");
    let liane = app.create_liane(&admin, &name, &[a, b, c, d]).await;
    let id = liane["id"].as_str().unwrap();
    let slug = liane["slug"].as_str().unwrap();
    assert!(slug.starts_with("ligne-"));
    assert_eq!(liane["route"]["type"], "LineString");
    assert_eq!(liane["route"]["coordinates"].as_array().unwrap().len(), 4);

    let (status, list) = app.get("/liane", None).await;
    assert_eq!(status, StatusCode::OK);
    assert!(contains_id(&list, &liane["id"]));

    let (status, detail) = app.get(&format!("/liane/{slug}"), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(detail["name"], name.as_str());
    assert_eq!(detail["member_count"], 0);
    let stop_ids: Vec<&str> = detail["stops"]
        .as_array()
        .unwrap()
        .iter()
        .map(|stop| stop["id"].as_str().unwrap())
        .collect();
    let expected: Vec<String> = [a, b, c, d]
        .iter()
        .map(|point| point.id.to_string())
        .collect();
    assert_eq!(stop_ids, expected);

    let search = |from: &common::Point, to: &common::Point| {
        format!(
            "/liane/search?from_lat={}&from_lng={}&to_lat={}&to_lng={}",
            from.lat + 0.01,
            from.lng,
            to.lat + 0.01,
            to.lng
        )
    };
    let (status, found) = app.get(&search(a, d), None).await;
    assert_eq!(status, StatusCode::OK);
    let hit = &found[0];
    assert_eq!(hit["liane"]["id"], liane["id"]);
    assert_eq!(hit["direction"], "Outbound");
    assert_eq!(hit["from_stop_id"], a.id.to_string());
    assert_eq!(hit["to_stop_id"], d.id.to_string());
    let (_, found) = app.get(&search(c, b), None).await;
    assert_eq!(found[0]["direction"], "Return");
    let (_, found) = app.get(&search(a, outside), None).await;
    assert_eq!(found.as_array().unwrap().len(), 0);

    let (rider, rider_id) = app.new_user("Rita").await;
    let (driver, _) = app.new_user("Denis").await;
    let (visitor, _) = app.new_user("Victor").await;
    let join = format!("/liane/{id}/membership");

    let section = membership(b, c, "1010000", "Outbound", true);
    let (status, _) = app.post(&join, None, section.clone()).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    for refused in [
        membership(b, outside, "1010000", "Outbound", false),
        membership(b, b, "1010000", "Outbound", false),
        membership(c, b, "1010000", "Outbound", false),
        membership(b, c, "0000000", "Outbound", false),
    ] {
        let (status, _) = app.post(&join, Some(&driver), refused).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    let (status, joined) = app.post(&join, Some(&driver), section.clone()).await;
    assert_eq!(status, StatusCode::OK, "{joined}");
    assert_eq!(joined["board_stop_id"], b.id.to_string());
    let (status, _) = app.post(&join, Some(&driver), section).await;
    assert_eq!(status, StatusCode::CONFLICT);

    let (status, _) = app
        .post(
            &join,
            Some(&rider),
            membership(a, d, "1000000", "Both", false),
        )
        .await;
    assert_eq!(status, StatusCode::OK);

    let (_, detail) = app.get(&format!("/liane/{slug}"), None).await;
    assert_eq!(detail["member_count"], 2);
    let monday = &detail["schedule"][0];
    assert_eq!(monday["day"], 0);
    assert_eq!(monday["outbound_members"], 2);
    assert_eq!(monday["outbound_drivers"], 1);
    assert_eq!(monday["return_members"], 1);
    assert_eq!(monday["return_drivers"], 0);
    assert_eq!(detail["schedule"][1]["outbound_members"], 0);
    assert_eq!(detail["schedule"][2]["outbound_members"], 1);
    assert_eq!(detail["schedule"][2]["return_members"], 0);
    assert_eq!(detail["schedule"].as_array().unwrap().len(), 7);

    assert!(detail["members"].is_null());
    assert!(detail["membership"].is_null());
    let public_text = detail.to_string();
    assert!(!public_text.contains(&rider_id));
    assert!(!public_text.contains("Rita"));

    let (_, seen_by_visitor) = app.get(&format!("/liane/{slug}"), Some(&visitor)).await;
    assert!(seen_by_visitor["members"].is_null());

    let (_, seen_by_member) = app.get(&format!("/liane/{slug}"), Some(&rider)).await;
    let pseudos: Vec<&str> = seen_by_member["members"]
        .as_array()
        .unwrap()
        .iter()
        .map(|member| member["user"]["pseudo"].as_str().unwrap())
        .collect();
    assert_eq!(pseudos, ["Denis T.", "Rita T."]);
    assert_eq!(seen_by_member["membership"]["direction"], "Both");

    let (status, mine) = app.get("/liane/mine", Some(&rider)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(mine.as_array().unwrap().len(), 1);
    assert_eq!(mine[0]["id"], liane["id"]);
    assert_eq!(mine[0]["membership"]["alight_stop_id"], d.id.to_string());
    let (status, _) = app.get("/liane/mine", None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    let (status, updated) = app
        .put(
            &join,
            Some(&rider),
            membership(a, c, "0000011", "Return", true),
        )
        .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(updated["direction"], "Return");
    let (status, _) = app
        .put(
            &join,
            Some(&visitor),
            membership(a, c, "0000011", "Return", true),
        )
        .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let (_, detail) = app.get(&format!("/liane/{slug}"), None).await;
    assert_eq!(detail["schedule"][0]["outbound_members"], 1);
    assert_eq!(detail["schedule"][6]["return_drivers"], 1);

    let (status, _) = app.delete(&join, Some(&rider)).await;
    assert_eq!(status, StatusCode::OK);
    let (status, _) = app.delete(&join, Some(&rider)).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let (status, _) = app.delete(&join, Some(&driver)).await;
    assert_eq!(status, StatusCode::OK);

    let (status, detail) = app.get(&format!("/liane/{slug}"), None).await;
    assert_eq!(
        status,
        StatusCode::OK,
        "une liane sans membre continue d'exister"
    );
    assert_eq!(detail["member_count"], 0);
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn only_admins_manage_lianes() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let (user, _) = app.new_user("Ursule").await;
    let points = app.points(4).await;
    let (a, b, c, d) = (&points[0], &points[1], &points[2], &points[3]);
    let name = unique_name("Vallée Française");
    let body = json!({ "name": name, "stop_ids": [a.id, b.id, c.id] });

    let (status, _) = app.post("/liane", None, body.clone()).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (status, _) = app.post("/liane", Some(&user), body.clone()).await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    for refused in [
        json!({ "name": name, "stop_ids": [a.id] }),
        json!({ "name": name, "stop_ids": [a.id, a.id] }),
        json!({ "name": name, "stop_ids": [a.id, uuid::Uuid::now_v7()] }),
        json!({ "name": "  ", "stop_ids": [a.id, b.id] }),
    ] {
        let (status, _) = app.post("/liane", Some(&admin), refused).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    let first = app.create_liane(&admin, &name, &[a, b, c]).await;
    let second = app.create_liane(&admin, &name, &[a, b]).await;
    let slug = first["slug"].as_str().unwrap();
    assert!(slug.starts_with("vallee-francaise-"));
    assert_eq!(second["slug"], format!("{slug}-2"));
    let id = first["id"].as_str().unwrap();
    let path = format!("/liane/{id}");

    let (status, _) = app.put(&path, Some(&user), body.clone()).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = app.delete(&path, Some(&user)).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = app.get("/liane/admin", Some(&user)).await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    let (status, _) = app
        .post(
            &format!("{path}/membership"),
            Some(&user),
            membership(b, c, "1111100", "Both", false),
        )
        .await;
    assert_eq!(status, StatusCode::OK);

    let renamed = unique_name("Autre nom");
    let (status, updated) = app
        .put(
            &path,
            Some(&admin),
            json!({ "name": renamed, "stop_ids": [d.id, a.id, b.id, c.id] }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{updated}");
    assert_eq!(updated["slug"], slug, "le slug reste stable");
    assert_eq!(updated["stops"][0]["id"], d.id.to_string());
    assert_eq!(updated["member_count"], 1);

    for breaking in [json!([a.id, b.id, d.id]), json!([a.id, c.id, b.id])] {
        let (status, _) = app
            .put(
                &path,
                Some(&admin),
                json!({ "name": renamed, "stop_ids": breaking }),
            )
            .await;
        assert_eq!(
            status,
            StatusCode::CONFLICT,
            "un arrêt utilisé par un membre est protégé"
        );
    }
    let (_, detail) = app.get(&format!("/liane/{slug}"), None).await;
    assert_eq!(
        detail["stops"].as_array().unwrap().len(),
        4,
        "la modification refusée est annulée"
    );

    let (status, _) = app
        .put(
            &path,
            Some(&admin),
            json!({ "name": renamed, "stop_ids": [d.id, a.id, b.id, c.id], "is_active": false }),
        )
        .await;
    assert_eq!(status, StatusCode::OK);
    let (_, public_list) = app.get("/liane", None).await;
    assert!(!contains_id(&public_list, &first["id"]));
    let (_, admin_list) = app.get("/liane/admin", Some(&admin)).await;
    assert!(contains_id(&admin_list, &first["id"]));
    let (status, _) = app.get(&format!("/liane/{slug}"), None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let (status, _) = app.get(&format!("/liane/{slug}"), Some(&admin)).await;
    assert_eq!(status, StatusCode::OK);
    let (status, _) = app.get(&format!("/liane/{slug}"), Some(&user)).await;
    assert_eq!(
        status,
        StatusCode::OK,
        "un membre voit encore sa liane désactivée"
    );
    let (newcomer, _) = app.new_user("Nina").await;
    let (status, _) = app
        .post(
            &format!("{path}/membership"),
            Some(&newcomer),
            membership(a, b, "1000000", "Both", false),
        )
        .await;
    assert_eq!(
        status,
        StatusCode::NOT_FOUND,
        "on ne rejoint pas une liane désactivée"
    );

    let (status, _) = app.delete(&path, Some(&admin)).await;
    assert_eq!(status, StatusCode::OK);
    let (status, _) = app.delete(&path, Some(&admin)).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let (status, _) = app.get(&format!("/liane/{slug}"), Some(&admin)).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn a_member_reports_another_and_an_admin_excludes_or_dismisses() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let points = app.points(2).await;
    let (a, b) = (&points[0], &points[1]);
    let liane = app
        .create_liane(&admin, &unique_name("Signalements"), &[a, b])
        .await;
    let id = liane["id"].as_str().unwrap();
    let slug = liane["slug"].as_str().unwrap();

    let (alice, alice_id) = app.new_user("Alice").await;
    let (bruno, bruno_id) = app.new_user("Bruno").await;
    let (chloe, chloe_id) = app.new_user("Chloé").await;
    let (stranger, stranger_id) = app.new_user("Simon").await;
    for member in [&alice, &bruno, &chloe] {
        let (status, _) = app
            .post(
                &format!("/liane/{id}/membership"),
                Some(member),
                membership(a, b, "1111100", "Both", false),
            )
            .await;
        assert_eq!(status, StatusCode::OK);
    }

    let report = |user_id: &str| format!("/liane/{id}/member/{user_id}/report");
    let reason = json!({ "reason": "Ne vient jamais aux rendez-vous" });

    let (status, _) = app.post(&report(&bruno_id), None, reason.clone()).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (status, _) = app
        .post(&report(&bruno_id), Some(&stranger), reason.clone())
        .await;
    assert_eq!(
        status,
        StatusCode::FORBIDDEN,
        "il faut être membre pour signaler"
    );
    let (status, _) = app
        .post(&report(&stranger_id), Some(&alice), reason.clone())
        .await;
    assert_eq!(
        status,
        StatusCode::NOT_FOUND,
        "on ne signale qu'un membre de la liane"
    );
    let (status, _) = app
        .post(&report(&alice_id), Some(&alice), reason.clone())
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "pas d'auto-signalement");
    let (status, _) = app
        .post(&report(&bruno_id), Some(&alice), json!({ "reason": " " }))
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let (status, _) = app
        .post(&report(&bruno_id), Some(&alice), reason.clone())
        .await;
    assert_eq!(status, StatusCode::OK);
    let (status, _) = app
        .post(&report(&bruno_id), Some(&alice), reason.clone())
        .await;
    assert_eq!(status, StatusCode::CONFLICT, "pas de doublon ouvert");
    let (status, _) = app
        .post(&report(&bruno_id), Some(&chloe), reason.clone())
        .await;
    assert_eq!(status, StatusCode::OK);

    let (status, _) = app.get("/liane/report", Some(&alice)).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, reports) = app.get("/liane/report", Some(&admin)).await;
    assert_eq!(status, StatusCode::OK);
    let about_bruno: Vec<_> = reports
        .as_array()
        .unwrap()
        .iter()
        .filter(|report| report["liane"]["id"] == liane["id"])
        .collect();
    assert_eq!(about_bruno.len(), 2);
    assert_eq!(about_bruno[0]["reported"]["pseudo"], "Bruno T.");
    assert_eq!(about_bruno[0]["reporter"]["pseudo"], "Alice T.");
    assert_eq!(about_bruno[0]["reason"], "Ne vient jamais aux rendez-vous");
    assert_eq!(about_bruno[0]["reported_is_member"], true);
    let report_id = about_bruno[0]["id"].as_str().unwrap().to_string();

    let exclude = format!("/liane/report/{report_id}/exclude");
    let (status, _) = app.post(&exclude, Some(&alice), json!({})).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = app.post(&exclude, Some(&admin), json!({})).await;
    assert_eq!(status, StatusCode::OK);
    let (status, _) = app.post(&exclude, Some(&admin), json!({})).await;
    assert_eq!(
        status,
        StatusCode::NOT_FOUND,
        "un signalement traité ne se traite pas deux fois"
    );

    let (_, detail) = app.get(&format!("/liane/{slug}"), Some(&alice)).await;
    assert_eq!(detail["member_count"], 2);
    assert!(!detail["members"].to_string().contains(&bruno_id));
    let (_, reports) = app.get("/liane/report", Some(&admin)).await;
    assert!(
        reports
            .as_array()
            .unwrap()
            .iter()
            .all(|report| report["liane"]["id"] != liane["id"]),
        "l'exclusion clôt tous les signalements ouverts sur ce membre"
    );
    let statuses: Vec<String> = sqlx::query_scalar(
        "SELECT status FROM liane_report WHERE liane_id = $1::uuid ORDER BY created_at",
    )
    .bind(id)
    .fetch_all(&app.db)
    .await
    .unwrap();
    assert_eq!(statuses, ["Excluded", "Excluded"]);

    let (status, _) = app
        .post(&report(&chloe_id), Some(&alice), reason.clone())
        .await;
    assert_eq!(status, StatusCode::OK);
    let (_, reports) = app.get("/liane/report", Some(&admin)).await;
    let about_chloe = reports
        .as_array()
        .unwrap()
        .iter()
        .find(|report| report["liane"]["id"] == liane["id"])
        .unwrap();
    let dismiss = format!(
        "/liane/report/{}/dismiss",
        about_chloe["id"].as_str().unwrap()
    );
    let (status, _) = app.post(&dismiss, Some(&alice), json!({})).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = app.post(&dismiss, Some(&admin), json!({})).await;
    assert_eq!(status, StatusCode::OK);
    let (status, _) = app.post(&dismiss, Some(&admin), json!({})).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let (_, detail) = app.get(&format!("/liane/{slug}"), None).await;
    assert_eq!(
        detail["member_count"], 2,
        "classer un signalement n'exclut personne"
    );
    let (status, _) = app.post(&report(&chloe_id), Some(&alice), reason).await;
    assert_eq!(
        status,
        StatusCode::OK,
        "un nouveau signalement est possible après classement"
    );

    let direct = format!("/liane/{id}/member/{chloe_id}");
    let (status, _) = app.delete(&direct, Some(&alice)).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = app.delete(&direct, Some(&admin)).await;
    assert_eq!(status, StatusCode::OK);
    let (_, detail) = app.get(&format!("/liane/{slug}"), None).await;
    assert_eq!(detail["member_count"], 1);
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn tiles_contain_lianes_stops_and_rallying_points() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let points = app.points(3).await;
    let (a, b, unused) = (&points[0], &points[1], &points[2]);
    let (x, y) = tile_of(a, 10);
    let (unused_x, unused_y) = tile_of(unused, 12);

    let tile_size = async |function: &str, x: i32, y: i32, zoom: i32| -> i32 {
        sqlx::query_scalar(&format!(
            "SELECT COALESCE(length({function}($1, $2, $3)), 0)"
        ))
        .bind(zoom)
        .bind(x)
        .bind(y)
        .fetch_one(&app.db)
        .await
        .unwrap()
    };

    assert!(tile_size("rallying_point_display", x, y, 10).await > 0);
    assert_eq!(tile_size("liane_display", x, y, 10).await, 0);
    assert_eq!(tile_size("liane_stop_display", x, y, 10).await, 0);

    let liane = app
        .create_liane(&admin, &unique_name("Tuiles"), &[a, b])
        .await;
    assert!(tile_size("liane_display", x, y, 10).await > 0);
    assert!(tile_size("liane_stop_display", x, y, 10).await > 0);
    assert_eq!(
        tile_size("liane_stop_display", unused_x, unused_y, 12).await,
        0
    );

    let id = liane["id"].as_str().unwrap();
    let (status, _) = app
        .put(
            &format!("/liane/{id}"),
            Some(&admin),
            json!({ "name": "Tuiles", "stop_ids": [a.id, b.id], "is_active": false }),
        )
        .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        tile_size("liane_display", x, y, 10).await,
        0,
        "une liane désactivée n'est plus sur la carte"
    );
}

#[tokio::test]
#[ignore = "exige TEST_DATABASE_URL"]
async fn a_trip_request_gets_suggestions_without_creating_anything() {
    let app = TestApp::spawn().await;
    let admin = app.admin_token().await;
    let points = app.points(3).await;
    let (a, b, c) = (&points[0], &points[1], &points[2]);
    let liane = app
        .create_liane(&admin, &unique_name("Rapprochement"), &[a, b, c])
        .await;

    let (mine, _) = app.new_user("Maya").await;
    let (theirs, _) = app.new_user("Théo").await;
    let request = |from: &common::Point, to: &common::Point| {
        json!({
            "waypoints": [from.id, to.id],
            "round_trip": false,
            "arrive_before": "09:00:00",
            "return_after": "18:00:00",
            "can_drive": true,
            "week_days": "1111100",
        })
    };
    let (status, my_request) = app.post("/liane_request", Some(&mine), request(a, c)).await;
    assert_eq!(status, StatusCode::OK, "{my_request}");
    let (status, their_request) = app
        .post("/liane_request", Some(&theirs), request(a, c))
        .await;
    assert_eq!(status, StatusCode::OK);

    let path = format!("/liane/match/{}", my_request["id"].as_str().unwrap());
    let (status, matches) = app.get(&path, Some(&mine)).await;
    assert_eq!(status, StatusCode::OK, "{matches}");
    assert_eq!(matches["lianes"][0]["liane"]["id"], liane["id"]);
    assert_eq!(matches["lianes"][0]["direction"], "Outbound");
    assert_eq!(matches["requests"][0]["request"]["id"], their_request["id"]);
    assert_eq!(
        matches["requests"][0]["request"]["user"]["pseudo"],
        "Théo T."
    );

    let (status, _) = app.get(&path, Some(&theirs)).await;
    assert_eq!(
        status,
        StatusCode::NOT_FOUND,
        "on ne consulte que ses propres demandes"
    );
    let (_, mine_list) = app.get("/liane/mine", Some(&mine)).await;
    assert_eq!(
        mine_list.as_array().unwrap().len(),
        0,
        "le rapprochement ne fait entrer dans aucune liane"
    );
}
