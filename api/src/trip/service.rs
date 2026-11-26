use chrono::{DateTime, Utc};
use sqlx::types::Json;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::auth::model::AuthUser;
use crate::error::{AppError, Result};
use crate::fr_time::day_and_time;
use crate::liane;
use crate::message;
use crate::message::model::{MessageContent, TripReference};
use crate::notification::Notifier;
use crate::notification::push::PushNotification;
use crate::trip::model::{
    AdminProof, AdminTrip, BookingInput, GestureInput, GestureKind, MyGesture, MyTrips,
    PassengerRow, PositionInput, PositionStatus, Trip, TripDetail, TripDirection, TripInput,
    TripLiane, TripPassenger, TripRole, TripRow, TripState, TripStop, TripUser,
};
use crate::trip::proof::{self, Occupant};
use crate::trip::rules::{
    self, END_CLOSES_AFTER_SECONDS, MAX_SEAT_COUNT, MIN_SEAT_COUNT, Refusal,
    START_CLOSES_AFTER_SECONDS,
};
use crate::wallet;

const PAST_TRIPS_LIMIT: i64 = 50;
const ADMIN_TRIPS_LIMIT: i64 = 200;

enum TripFilter {
    One(Uuid),
    OpenOfLiane(Uuid),
    OpenOfUser(Uuid),
    PastOfUser(Uuid),
    All,
}

#[derive(Debug, FromRow)]
struct StopOnLine {
    rallying_point_id: Uuid,
    ordinal: i32,
    distance_meters: i32,
}

#[derive(Debug, FromRow)]
struct LockedTrip {
    liane_id: Uuid,
    driver_id: Uuid,
    departure_time: DateTime<Utc>,
    direction: TripDirection,
    from_rp_id: Uuid,
    to_rp_id: Uuid,
    seat_count: i32,
    state: TripState,
}

pub async fn create(
    db: &PgPool,
    notifier: &Notifier,
    driver: &AuthUser,
    liane_id: &Uuid,
    input: &TripInput,
) -> Result<TripDetail> {
    let is_active: Option<bool> = sqlx::query_scalar("SELECT is_active FROM liane WHERE id = $1")
        .bind(liane_id)
        .fetch_optional(db)
        .await?;
    if is_active != Some(true) {
        return Err(AppError::NotFound);
    }
    let (default_from, default_to) =
        member_section(db, liane_id, &driver.id, input.direction).await?;

    if !(MIN_SEAT_COUNT..=MAX_SEAT_COUNT).contains(&input.seat_count)
        || !rules::is_valid_departure(input.departure_time, Utc::now())
    {
        return Err(AppError::BadRequest);
    }

    let from = input.from_stop_id.unwrap_or(default_from);
    let to = input.to_stop_id.unwrap_or(default_to);
    let stops = find_stops(db, liane_id).await?;
    let distance_meters =
        section_distance(&stops, input.direction, &from, &to).ok_or(AppError::BadRequest)?;

    let id: Uuid = sqlx::query_scalar(
        r#"
            INSERT INTO trip (
                liane_id, driver_id, created_by, departure_time, direction,
                from_rp_id, to_rp_id, seat_count, distance_meters
            )
            VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        "#,
    )
    .bind(liane_id)
    .bind(driver.id)
    .bind(input.departure_time)
    .bind(input.direction)
    .bind(from)
    .bind(to)
    .bind(input.seat_count)
    .bind(distance_meters)
    .fetch_one(db)
    .await?;

    let detail = find_detail(db, &id, driver).await?;
    let trip = &detail.trip;
    let text = format!(
        "{} propose un trajet {}, {}",
        pseudo(&trip.driver),
        section(trip),
        day_and_time(trip.departure_time)
    );
    let content = MessageContent::TripProposed(trip_reference(trip));
    announce(db, notifier, trip, &content, &text).await?;
    notifier.push(
        db,
        liane::find_member_ids_except(db, liane_id, &driver.id).await?,
        trip_notification(trip, format!("Nouveau trajet · {}", trip.liane.name), text),
    );
    Ok(detail)
}

/// Trajets à venir ou en cours d'une liane, réservés à ses membres (et aux administrateurs).
pub async fn list_open_of_liane(
    db: &PgPool,
    liane_id: &Uuid,
    viewer: &AuthUser,
) -> Result<Vec<Trip>> {
    if !viewer.is_admin && !liane::is_member(db, liane_id, &viewer.id).await? {
        return Err(AppError::Forbidden);
    }
    find_trips(db, &viewer.id, TripFilter::OpenOfLiane(*liane_id)).await
}

pub async fn list_mine(db: &PgPool, user_id: &Uuid) -> Result<MyTrips> {
    Ok(MyTrips {
        upcoming: find_trips(db, user_id, TripFilter::OpenOfUser(*user_id)).await?,
        past: find_trips(db, user_id, TripFilter::PastOfUser(*user_id)).await?,
    })
}

pub async fn find_detail(db: &PgPool, id: &Uuid, viewer: &AuthUser) -> Result<TripDetail> {
    let trip = find_trips(db, &viewer.id, TripFilter::One(*id))
        .await?
        .into_iter()
        .next()
        .ok_or(AppError::NotFound)?;

    let can_see = viewer.is_admin
        || trip.my_role.is_some()
        || liane::is_member(db, &trip.liane.id, &viewer.id).await?;
    if !can_see {
        return Err(AppError::Forbidden);
    }

    let gestures = proof::find_gestures(db, id).await?;
    let driver = Occupant::of(&gestures, &trip.driver.id);
    let viewer_is_driver = trip.my_role == Some(TripRole::Driver);

    let passengers = find_passengers(db, id)
        .await?
        .into_iter()
        .map(|row| {
            let occupant = Occupant::of(&gestures, &row.user_id);
            let can_see_attestation =
                viewer.is_admin || viewer_is_driver || row.user_id == viewer.id;
            TripPassenger {
                started_at: occupant.start.map(|gesture| gesture.recorded_at),
                ended_at: occupant.end.map(|gesture| gesture.recorded_at),
                attestation: row
                    .proof_class
                    .filter(|_| can_see_attestation)
                    .map(Into::into),
                user: TripUser {
                    id: row.user_id,
                    pseudo: row.pseudo,
                },
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
            }
        })
        .collect();

    let mine = Occupant::of(&gestures, &viewer.id);
    let next_gesture = trip.my_role.and_then(|_| {
        rules::next_gesture(
            trip.state,
            trip.departure_time,
            Utc::now(),
            mine.start.is_some(),
            mine.end.is_some(),
        )
    });

    Ok(TripDetail {
        driver_started_at: driver.start.map(|gesture| gesture.recorded_at),
        driver_ended_at: driver.end.map(|gesture| gesture.recorded_at),
        passengers,
        my_gestures: [mine.start, mine.end]
            .into_iter()
            .flatten()
            .map(|gesture| MyGesture {
                kind: gesture.kind,
                recorded_at: gesture.recorded_at,
                position_status: gesture.position_status,
            })
            .collect(),
        next_gesture,
        gesture_window: rules::gesture_window(trip.departure_time),
        trip,
    })
}

/// Le conducteur annule un trajet qui n'a pas commencé ; les inscrits sont prévenus.
pub async fn cancel(
    db: &PgPool,
    notifier: &Notifier,
    id: &Uuid,
    driver: &AuthUser,
) -> Result<TripDetail> {
    let mut tx = db.begin().await?;
    let trip = lock(&mut tx, id).await?;
    if trip.driver_id != driver.id {
        return Err(AppError::Forbidden);
    }
    match trip.state {
        TripState::Planned => {}
        TripState::Canceled => return Err(refused(Refusal::TripCanceled)),
        TripState::Started | TripState::Finished => {
            return Err(refused(Refusal::TripAlreadyStarted));
        }
    }
    sqlx::query("UPDATE trip SET state = 'Canceled', canceled_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;

    let detail = find_detail(db, id, driver).await?;
    let trip = &detail.trip;
    let text = format!(
        "{} a annulé le trajet {} du {}",
        pseudo(&trip.driver),
        section(trip),
        day_and_time(trip.departure_time)
    );
    let content = MessageContent::TripCanceled(trip_reference(trip));
    announce(db, notifier, trip, &content, &text).await?;
    notifier.push(
        db,
        passenger_ids(&detail),
        trip_notification(trip, "Trajet annulé".to_string(), text),
    );
    Ok(detail)
}

/// Inscription immédiate d'un membre comme passager, sur un tronçon compris dans celui du conducteur.
pub async fn book(
    db: &PgPool,
    notifier: &Notifier,
    id: &Uuid,
    passenger: &AuthUser,
    input: &BookingInput,
) -> Result<TripDetail> {
    let mut tx = db.begin().await?;
    let trip = lock(&mut tx, id).await?;
    let (member_from, member_to) =
        member_section(db, &trip.liane_id, &passenger.id, trip.direction).await?;

    if trip.driver_id == passenger.id {
        return Err(refused(Refusal::DriverCannotBook));
    }
    if trip.state == TripState::Canceled {
        return Err(refused(Refusal::TripCanceled));
    }
    if trip.state != TripState::Planned
        || !rules::is_open(trip.state, trip.departure_time, Utc::now())
    {
        return Err(refused(Refusal::TripClosed));
    }

    let stops = find_stops(db, &trip.liane_id).await?;
    let (from, to) = match (input.from_stop_id, input.to_stop_id) {
        (Some(from), Some(to)) => (from, to),
        (from, to) => {
            let (default_from, default_to) =
                clamped_section(&stops, &trip, &member_from, &member_to)
                    .ok_or(AppError::BadRequest)?;
            (from.unwrap_or(default_from), to.unwrap_or(default_to))
        }
    };
    let distance_meters = section_distance(&stops, trip.direction, &from, &to)
        .filter(|_| is_within_trip(&stops, &trip, &from, &to))
        .ok_or(AppError::BadRequest)?;

    let bookings: Vec<Uuid> = sqlx::query_scalar(
        "SELECT user_id FROM trip_member WHERE trip_id = $1 AND canceled_at IS NULL",
    )
    .bind(id)
    .fetch_all(&mut *tx)
    .await?;
    if bookings.contains(&passenger.id) {
        return Err(refused(Refusal::AlreadyBooked));
    }
    if bookings.len() as i32 >= trip.seat_count {
        return Err(refused(Refusal::TripFull));
    }

    sqlx::query(
        r#"
            INSERT INTO trip_member (trip_id, user_id, from_rp_id, to_rp_id, distance_meters)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (trip_id, user_id) DO UPDATE
                SET from_rp_id = $3,
                    to_rp_id = $4,
                    distance_meters = $5,
                    canceled_at = NULL,
                    created_at = NOW()
        "#,
    )
    .bind(id)
    .bind(passenger.id)
    .bind(from)
    .bind(to)
    .bind(distance_meters)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    proof::refresh(db, id).await?;

    let detail = find_detail(db, id, passenger).await?;
    let trip = &detail.trip;
    notifier.push(
        db,
        vec![trip.driver.id],
        trip_notification(
            trip,
            "Un passager de plus".to_string(),
            format!(
                "{} a réservé une place sur votre trajet {} du {}",
                passenger_pseudo(&detail, &passenger.id),
                section(trip),
                day_and_time(trip.departure_time)
            ),
        ),
    );
    Ok(detail)
}

/// Désinscription d'un passager, tant qu'il n'a pas déclaré sa montée.
pub async fn unbook(
    db: &PgPool,
    notifier: &Notifier,
    id: &Uuid,
    passenger: &AuthUser,
) -> Result<TripDetail> {
    remove_booking(db, notifier, id, passenger).await?;
    find_detail(db, id, passenger).await
}

async fn remove_booking(
    db: &PgPool,
    notifier: &Notifier,
    id: &Uuid,
    passenger: &AuthUser,
) -> Result<()> {
    let before = find_detail(db, id, passenger).await?;
    let leaver = passenger_pseudo(&before, &passenger.id);

    let mut tx = db.begin().await?;
    let trip = lock(&mut tx, id).await?;
    match trip.state {
        TripState::Planned | TripState::Started => {}
        TripState::Canceled => return Err(refused(Refusal::TripCanceled)),
        TripState::Finished => return Err(refused(Refusal::TripClosed)),
    }
    let has_gesture: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM trip_event WHERE trip_id = $1 AND user_id = $2)",
    )
    .bind(id)
    .bind(passenger.id)
    .fetch_one(&mut *tx)
    .await?;
    if has_gesture {
        return Err(refused(Refusal::AlreadyOnBoard));
    }

    let removed = sqlx::query(
        r#"
            UPDATE trip_member
            SET canceled_at = NOW()
            WHERE trip_id = $1
              AND user_id = $2
              AND canceled_at IS NULL
        "#,
    )
    .bind(id)
    .bind(passenger.id)
    .execute(&mut *tx)
    .await?;
    if removed.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    tx.commit().await?;
    proof::refresh(db, id).await?;

    let trip = &before.trip;
    notifier.push(
        db,
        vec![trip.driver.id],
        trip_notification(
            trip,
            "Un passager en moins".to_string(),
            format!(
                "{leaver} ne vient plus au trajet {} du {}",
                section(trip),
                day_and_time(trip.departure_time)
            ),
        ),
    );
    Ok(())
}

/// Un occupant déclare le début ou la fin de son trajet. L'heure est celle du serveur ;
/// la position est facultative et ne fait jamais refuser le geste.
/// Un passager descendu doit sa part des frais si le partage s'applique (voir `wallet`).
pub async fn record_gesture(
    db: &PgPool,
    notifier: &Notifier,
    cost_share_cents_per_km: Option<i32>,
    id: &Uuid,
    occupant: &AuthUser,
    input: &GestureInput,
) -> Result<TripDetail> {
    let position = input.position.map(validated_position).transpose()?;
    let position_status = match (position, input.position_status) {
        (Some(_), _) => PositionStatus::Granted,
        (None, Some(PositionStatus::Denied)) => PositionStatus::Denied,
        (None, _) => PositionStatus::Unavailable,
    };

    let mut tx = db.begin().await?;
    let trip = lock(&mut tx, id).await?;
    let is_driver = trip.driver_id == occupant.id;
    let (from, to) = if is_driver {
        (trip.from_rp_id, trip.to_rp_id)
    } else {
        sqlx::query_as(
            r#"
                SELECT from_rp_id, to_rp_id
                FROM trip_member
                WHERE trip_id = $1
                  AND user_id = $2
                  AND canceled_at IS NULL
            "#,
        )
        .bind(id)
        .bind(occupant.id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(AppError::Forbidden)?
    };

    let done: Vec<GestureKind> =
        sqlx::query_scalar("SELECT kind FROM trip_event WHERE trip_id = $1 AND user_id = $2")
            .bind(id)
            .bind(occupant.id)
            .fetch_all(&mut *tx)
            .await?;
    rules::check_gesture(
        input.kind,
        trip.state,
        trip.departure_time,
        Utc::now(),
        done.contains(&GestureKind::Start),
        done.contains(&GestureKind::End),
    )
    .map_err(refused)?;

    let expected_stop = match input.kind {
        GestureKind::Start => from,
        GestureKind::End => to,
    };
    sqlx::query(
        r#"
            INSERT INTO trip_event (
                trip_id, user_id, kind, position_status, lat, lng, accuracy_meters,
                expected_rp_id, distance_to_stop_meters
            )
            SELECT
                $1, $2, $3, $4, $5, $6, $7, rp.id,
                ROUND(ST_Distance(
                    rp.location,
                    ST_SetSRID(ST_MakePoint($6, $5), 4326)::geography
                ))::integer
            FROM rallying_point rp
            WHERE rp.id = $8
        "#,
    )
    .bind(id)
    .bind(occupant.id)
    .bind(input.kind)
    .bind(position_status)
    .bind(position.map(|position| position.lat))
    .bind(position.map(|position| position.lng))
    .bind(position.and_then(|position| position.accuracy_meters))
    .bind(expected_stop)
    .execute(&mut *tx)
    .await?;

    if is_driver {
        let state = match input.kind {
            GestureKind::Start => TripState::Started,
            GestureKind::End => TripState::Finished,
        };
        sqlx::query("UPDATE trip SET state = $2 WHERE id = $1")
            .bind(id)
            .bind(state)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    proof::refresh(db, id).await?;
    wallet::service::record_entries(db, cost_share_cents_per_km, id).await?;

    let detail = find_detail(db, id, occupant).await?;
    if is_driver {
        announce_driver_gesture(db, notifier, &detail, input.kind).await?;
    }
    Ok(detail)
}

/// Un membre qui quitte une liane (ou en est exclu) n'y conduit plus et n'y est plus passager :
/// ses trajets pas encore commencés sont annulés, ses inscriptions à venir retirées.
pub async fn withdraw_member(
    db: &PgPool,
    notifier: &Notifier,
    liane_id: &Uuid,
    user_id: &Uuid,
) -> Result<()> {
    let member = AuthUser {
        id: *user_id,
        is_admin: false,
        session_id: Uuid::nil(),
    };

    let driven: Vec<Uuid> = sqlx::query_scalar(
        "SELECT id FROM trip WHERE liane_id = $1 AND driver_id = $2 AND state = 'Planned'",
    )
    .bind(liane_id)
    .bind(user_id)
    .fetch_all(db)
    .await?;
    for trip_id in driven {
        cancel(db, notifier, &trip_id, &member).await?;
    }

    let booked: Vec<Uuid> = sqlx::query_scalar(
        r#"
            SELECT t.id
            FROM trip t
            INNER JOIN trip_member tm ON tm.trip_id = t.id
            WHERE t.liane_id = $1
              AND t.state IN ('Planned', 'Started')
              AND tm.user_id = $2
              AND tm.canceled_at IS NULL
              AND NOT EXISTS (
                  SELECT 1 FROM trip_event e WHERE e.trip_id = t.id AND e.user_id = tm.user_id
              )
        "#,
    )
    .bind(liane_id)
    .bind(user_id)
    .fetch_all(db)
    .await?;
    for trip_id in booked {
        remove_booking(db, notifier, &trip_id, &member).await?;
    }
    Ok(())
}

pub async fn list_for_admin(db: &PgPool, admin_id: &Uuid) -> Result<Vec<AdminTrip>> {
    let trips = find_trips(db, admin_id, TripFilter::All).await?;
    let mut admin_trips = Vec::with_capacity(trips.len());
    for trip in trips {
        let proofs = find_passengers(db, &trip.id)
            .await?
            .into_iter()
            .map(|row| AdminProof {
                passenger: TripUser {
                    id: row.user_id,
                    pseudo: row.pseudo,
                },
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
                proof_class: row.proof_class,
                proof_detail: row.proof_detail.map(|Json(detail)| detail),
            })
            .collect();
        admin_trips.push(AdminTrip { trip, proofs });
    }
    Ok(admin_trips)
}

async fn find_trips(db: &PgPool, viewer_id: &Uuid, filter: TripFilter) -> Result<Vec<Trip>> {
    let is_open = format!(
        r#"(
            (t.state = 'Planned' AND t.departure_time > NOW() - make_interval(secs => {START_CLOSES_AFTER_SECONDS}))
            OR (t.state = 'Started' AND t.departure_time > NOW() - make_interval(secs => {END_CLOSES_AFTER_SECONDS}))
        )"#
    );
    let takes_part = r#"(
        t.driver_id = $2
        OR EXISTS (
            SELECT 1 FROM trip_member tm
            WHERE tm.trip_id = t.id AND tm.user_id = $2 AND tm.canceled_at IS NULL
        )
    )"#;
    let (condition, order, parameter) = match filter {
        TripFilter::One(id) => ("t.id = $2".to_string(), "t.id", Some(id)),
        TripFilter::OpenOfLiane(liane_id) => (
            format!("t.liane_id = $2 AND {is_open}"),
            "t.departure_time, t.id",
            Some(liane_id),
        ),
        TripFilter::OpenOfUser(user_id) => (
            format!("{takes_part} AND {is_open}"),
            "t.departure_time, t.id",
            Some(user_id),
        ),
        TripFilter::PastOfUser(user_id) => (
            format!("{takes_part} AND NOT {is_open}"),
            "t.departure_time DESC, t.id",
            Some(user_id),
        ),
        TripFilter::All => (
            "$2::uuid IS NULL".to_string(),
            "t.departure_time DESC, t.id",
            None,
        ),
    };
    let limit = match filter {
        TripFilter::PastOfUser(_) => PAST_TRIPS_LIMIT,
        _ => ADMIN_TRIPS_LIMIT,
    };

    let rows = sqlx::query_as::<_, TripRow>(&format!(
        r#"
            SELECT
                t.id,
                t.liane_id,
                l.name AS liane_name,
                l.slug AS liane_slug,
                t.driver_id,
                driver.pseudo AS driver_pseudo,
                t.departure_time,
                t.direction,
                origin.id AS from_id,
                origin.label AS from_label,
                origin.city AS from_city,
                destination.id AS to_id,
                destination.label AS to_label,
                destination.city AS to_city,
                t.seat_count,
                (
                    SELECT COUNT(*) FROM trip_member tm
                    WHERE tm.trip_id = t.id AND tm.canceled_at IS NULL
                ) AS passenger_count,
                t.distance_meters,
                t.state,
                EXISTS (
                    SELECT 1 FROM trip_member tm
                    WHERE tm.trip_id = t.id AND tm.user_id = $1 AND tm.canceled_at IS NULL
                ) AS viewer_is_passenger,
                driver.wallet_opened_at IS NOT NULL AS driver_has_wallet
            FROM trip t
            INNER JOIN liane l ON l.id = t.liane_id
            INNER JOIN "user" driver ON driver.id = t.driver_id
            INNER JOIN rallying_point origin ON origin.id = t.from_rp_id
            INNER JOIN rallying_point destination ON destination.id = t.to_rp_id
            WHERE {condition}
            ORDER BY {order}
            LIMIT $3
        "#
    ))
    .bind(viewer_id)
    .bind(parameter)
    .bind(limit)
    .fetch_all(db)
    .await?;

    let now = Utc::now();
    Ok(rows
        .into_iter()
        .map(|row| to_trip(row, viewer_id, now))
        .collect())
}

fn to_trip(row: TripRow, viewer_id: &Uuid, now: DateTime<Utc>) -> Trip {
    let my_role = if &row.driver_id == viewer_id {
        Some(TripRole::Driver)
    } else if row.viewer_is_passenger {
        Some(TripRole::Passenger)
    } else {
        None
    };
    Trip {
        id: row.id,
        liane: TripLiane {
            id: row.liane_id,
            name: row.liane_name,
            slug: row.liane_slug,
        },
        driver: TripUser {
            id: row.driver_id,
            pseudo: row.driver_pseudo,
        },
        departure_time: row.departure_time,
        direction: row.direction,
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
        seat_count: row.seat_count,
        seats_left: (i64::from(row.seat_count) - row.passenger_count).max(0) as i32,
        distance_meters: row.distance_meters,
        state: row.state,
        is_open: rules::is_open(row.state, row.departure_time, now),
        my_role,
        driver_has_wallet: row.driver_has_wallet,
    }
}

async fn find_passengers(db: &PgPool, trip_id: &Uuid) -> Result<Vec<PassengerRow>> {
    let passengers = sqlx::query_as::<_, PassengerRow>(
        r#"
            SELECT
                tm.user_id,
                u.pseudo,
                origin.id AS from_id,
                origin.label AS from_label,
                origin.city AS from_city,
                destination.id AS to_id,
                destination.label AS to_label,
                destination.city AS to_city,
                tm.distance_meters,
                tm.proof_class,
                tm.proof_detail
            FROM trip_member tm
            INNER JOIN "user" u ON u.id = tm.user_id
            INNER JOIN rallying_point origin ON origin.id = tm.from_rp_id
            INNER JOIN rallying_point destination ON destination.id = tm.to_rp_id
            WHERE tm.trip_id = $1
              AND tm.canceled_at IS NULL
            ORDER BY tm.created_at, tm.user_id
        "#,
    )
    .bind(trip_id)
    .fetch_all(db)
    .await?;
    Ok(passengers)
}

async fn lock(connection: &mut sqlx::PgConnection, id: &Uuid) -> Result<LockedTrip> {
    sqlx::query_as::<_, LockedTrip>(
        r#"
            SELECT liane_id, driver_id, departure_time, direction, from_rp_id, to_rp_id, seat_count, state
            FROM trip
            WHERE id = $1
            FOR UPDATE
        "#,
    )
    .bind(id)
    .fetch_optional(connection)
    .await?
    .ok_or(AppError::NotFound)
}

/// Le tronçon de l'adhésion d'un membre, dans le sens du trajet. Refuse un non-membre.
async fn member_section(
    db: &PgPool,
    liane_id: &Uuid,
    user_id: &Uuid,
    direction: TripDirection,
) -> Result<(Uuid, Uuid)> {
    let (board, alight) = liane::find_member_stops(db, liane_id, user_id)
        .await?
        .ok_or(AppError::Forbidden)?;
    Ok(match direction {
        TripDirection::Outbound => (board, alight),
        TripDirection::Return => (alight, board),
    })
}

async fn find_stops(db: &PgPool, liane_id: &Uuid) -> Result<Vec<StopOnLine>> {
    let stops = sqlx::query_as::<_, StopOnLine>(
        r#"
            SELECT rallying_point_id, ordinal, distance_meters
            FROM liane_stop
            WHERE liane_id = $1
            ORDER BY ordinal
        "#,
    )
    .bind(liane_id)
    .fetch_all(db)
    .await?;
    Ok(stops)
}

/// Rang d'un arrêt dans le sens du trajet : il croît du départ vers l'arrivée.
fn rank(stops: &[StopOnLine], direction: TripDirection, stop_id: &Uuid) -> Option<i32> {
    let stop = stops
        .iter()
        .find(|stop| &stop.rallying_point_id == stop_id)?;
    Some(match direction {
        TripDirection::Outbound => stop.ordinal,
        TripDirection::Return => -stop.ordinal,
    })
}

/// Distance le long de la liane entre deux de ses arrêts pris dans le sens du trajet.
fn section_distance(
    stops: &[StopOnLine],
    direction: TripDirection,
    from: &Uuid,
    to: &Uuid,
) -> Option<i32> {
    if rank(stops, direction, from)? >= rank(stops, direction, to)? {
        return None;
    }
    let distance_of = |stop_id: &Uuid| {
        stops
            .iter()
            .find(|stop| &stop.rallying_point_id == stop_id)
            .map(|stop| stop.distance_meters)
    };
    Some((distance_of(to)? - distance_of(from)?).abs())
}

fn is_within_trip(stops: &[StopOnLine], trip: &LockedTrip, from: &Uuid, to: &Uuid) -> bool {
    let rank_of = |stop_id| rank(stops, trip.direction, stop_id);
    match (
        rank_of(&trip.from_rp_id),
        rank_of(from),
        rank_of(to),
        rank_of(&trip.to_rp_id),
    ) {
        (Some(trip_from), Some(from), Some(to), Some(trip_to)) => {
            trip_from <= from && from < to && to <= trip_to
        }
        _ => false,
    }
}

/// La partie du tronçon habituel du membre que couvre le trajet, s'il y en a une.
fn clamped_section(
    stops: &[StopOnLine],
    trip: &LockedTrip,
    member_from: &Uuid,
    member_to: &Uuid,
) -> Option<(Uuid, Uuid)> {
    let rank_of = |stop_id| rank(stops, trip.direction, stop_id);
    let from = if rank_of(member_from)? < rank_of(&trip.from_rp_id)? {
        trip.from_rp_id
    } else {
        *member_from
    };
    let to = if rank_of(member_to)? > rank_of(&trip.to_rp_id)? {
        trip.to_rp_id
    } else {
        *member_to
    };
    (rank_of(&from)? < rank_of(&to)?).then_some((from, to))
}

fn validated_position(position: PositionInput) -> Result<PositionInput> {
    let is_valid = (-90.0..=90.0).contains(&position.lat)
        && (-180.0..=180.0).contains(&position.lng)
        && position
            .accuracy_meters
            .is_none_or(|accuracy| accuracy.is_finite() && accuracy >= 0.0);
    if is_valid {
        Ok(position)
    } else {
        Err(AppError::BadRequest)
    }
}

fn refused(refusal: Refusal) -> AppError {
    AppError::Conflict(refusal.code().to_string())
}

fn pseudo(user: &TripUser) -> &str {
    user.pseudo.as_deref().unwrap_or("Un membre")
}

fn passenger_pseudo(detail: &TripDetail, user_id: &Uuid) -> String {
    detail
        .passengers
        .iter()
        .find(|passenger| &passenger.user.id == user_id)
        .map(|passenger| pseudo(&passenger.user))
        .unwrap_or("Un membre")
        .to_string()
}

fn passenger_ids(detail: &TripDetail) -> Vec<Uuid> {
    detail
        .passengers
        .iter()
        .map(|passenger| passenger.user.id)
        .collect()
}

fn section(trip: &Trip) -> String {
    format!("{} → {}", trip.from_stop.name(), trip.to_stop.name())
}

fn trip_notification(trip: &Trip, title: String, body: String) -> PushNotification {
    PushNotification {
        title,
        body,
        url: format!("/trajet/{}", trip.id),
        tag: format!("trip-{}", trip.id),
    }
}

async fn announce(
    db: &PgPool,
    notifier: &Notifier,
    trip: &Trip,
    content: &MessageContent,
    text: &str,
) -> Result<()> {
    message::service::post_event(db, notifier, &trip.liane.id, &trip.driver.id, content, text)
        .await?;
    Ok(())
}

fn trip_reference(trip: &Trip) -> TripReference {
    TripReference {
        trip_id: trip.id,
        departure_time: trip.departure_time,
    }
}

/// « X a démarré le trajet » / « X a terminé le trajet » (formulations sans accord en genre) : dans le fil de la liane, et en notification aux passagers.
async fn announce_driver_gesture(
    db: &PgPool,
    notifier: &Notifier,
    detail: &TripDetail,
    kind: GestureKind,
) -> Result<()> {
    let trip = &detail.trip;
    let (content, title, place, reminder) = match kind {
        GestureKind::Start => (
            MessageContent::TripStarted(trip_reference(trip)),
            format!("{} a démarré le trajet", pseudo(&trip.driver)),
            format!("de {}", trip.from_stop.name()),
            "Quand vous montez, ouvrez le trajet et touchez « Je monte ».",
        ),
        GestureKind::End => (
            MessageContent::TripFinished(trip_reference(trip)),
            format!("{} a terminé le trajet", pseudo(&trip.driver)),
            format!("à {}", trip.to_stop.name()),
            "À la descente, ouvrez le trajet et touchez « Je descends ».",
        ),
    };
    announce(db, notifier, trip, &content, &format!("{title} {place}")).await?;
    notifier.push(
        db,
        passenger_ids(detail),
        trip_notification(trip, title, reminder.to_string()),
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn line() -> (Vec<StopOnLine>, Vec<Uuid>) {
        let ids: Vec<Uuid> = (0..4).map(|_| Uuid::now_v7()).collect();
        let stops = ids
            .iter()
            .enumerate()
            .map(|(index, id)| StopOnLine {
                rallying_point_id: *id,
                ordinal: index as i32,
                distance_meters: index as i32 * 10_000,
            })
            .collect();
        (stops, ids)
    }

    fn trip(direction: TripDirection, from: Uuid, to: Uuid) -> LockedTrip {
        LockedTrip {
            liane_id: Uuid::nil(),
            driver_id: Uuid::nil(),
            departure_time: Utc::now(),
            direction,
            from_rp_id: from,
            to_rp_id: to,
            seat_count: 3,
            state: TripState::Planned,
        }
    }

    #[test]
    fn a_section_follows_the_direction_of_the_trip() {
        let (stops, ids) = line();
        let distance = |direction, from: usize, to: usize| {
            section_distance(&stops, direction, &ids[from], &ids[to])
        };
        assert_eq!(distance(TripDirection::Outbound, 0, 3), Some(30_000));
        assert_eq!(distance(TripDirection::Outbound, 3, 0), None);
        assert_eq!(distance(TripDirection::Return, 3, 1), Some(20_000));
        assert_eq!(distance(TripDirection::Return, 1, 3), None);
        assert_eq!(distance(TripDirection::Outbound, 1, 1), None);
        assert_eq!(
            section_distance(&stops, TripDirection::Outbound, &ids[0], &Uuid::now_v7()),
            None
        );
    }

    #[test]
    fn a_passenger_section_must_lie_within_the_driver_section() {
        let (stops, ids) = line();
        let outbound = trip(TripDirection::Outbound, ids[1], ids[3]);
        assert!(is_within_trip(&stops, &outbound, &ids[1], &ids[3]));
        assert!(is_within_trip(&stops, &outbound, &ids[2], &ids[3]));
        assert!(!is_within_trip(&stops, &outbound, &ids[0], &ids[2]));
        assert!(!is_within_trip(&stops, &outbound, &ids[3], &ids[2]));

        let back = trip(TripDirection::Return, ids[3], ids[1]);
        assert!(is_within_trip(&stops, &back, &ids[3], &ids[2]));
        assert!(!is_within_trip(&stops, &back, &ids[2], &ids[3]));
        assert!(!is_within_trip(&stops, &back, &ids[2], &ids[0]));
    }

    #[test]
    fn the_usual_section_of_a_member_is_clamped_to_the_trip() {
        let (stops, ids) = line();
        let outbound = trip(TripDirection::Outbound, ids[1], ids[2]);
        assert_eq!(
            clamped_section(&stops, &outbound, &ids[0], &ids[3]),
            Some((ids[1], ids[2]))
        );
        assert_eq!(clamped_section(&stops, &outbound, &ids[2], &ids[3]), None);

        let back = trip(TripDirection::Return, ids[3], ids[0]);
        assert_eq!(
            clamped_section(&stops, &back, &ids[2], &ids[1]),
            Some((ids[2], ids[1]))
        );
    }
}
