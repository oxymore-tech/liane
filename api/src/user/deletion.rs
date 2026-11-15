//! Suppression de son compte par l'utilisateur (droit à l'effacement).
//!
//! Effacé : nom, prénom, pseudo, photo, numéro de téléphone, sessions, abonnements aux notifications,
//! adhésions aux lianes, demandes de trajet, messages (écrits ou automatiques à son nom), signalements
//! faits par lui ou contre lui, trajets et inscriptions pour lesquels personne n'a rien déclaré.
//!
//! Conservé, détaché de toute identité lisible : les trajets attestés (au moins un geste de départ ou
//! d'arrivée déclaré), avec leurs gestes et positions, rattachés à une coquille de compte anonyme qui ne
//! garde que l'identité pseudonymisée demandée par le registre de preuve de covoiturage.

use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::session;
use crate::error::Result;
use crate::liane;
use crate::notification::Notifier;
use crate::trip;
use crate::user::identity::{identity_key, phone_trunc};

pub async fn delete_account(db: &PgPool, notifier: &Notifier, user_id: &Uuid) -> Result<()> {
    leave_lianes(db, notifier, user_id).await?;

    let mut tx = db.begin().await?;

    session::close_all(&mut tx, user_id).await?;
    for statement in [
        "DELETE FROM push_subscription WHERE user_id = $1",
        r#"DELETE FROM sms_code WHERE phone = (SELECT phone FROM "user" WHERE id = $1)"#,
        "DELETE FROM liane_member WHERE user_id = $1",
        "DELETE FROM liane_request WHERE user_id = $1",
        "DELETE FROM liane_message WHERE user_id = $1",
        "DELETE FROM liane_report WHERE reporter_user_id = $1 OR reported_user_id = $1",
        "UPDATE liane_report SET resolved_by = NULL WHERE resolved_by = $1",
        "UPDATE liane SET created_by = NULL WHERE created_by = $1",
        "UPDATE trip SET created_by = NULL WHERE created_by = $1",
        // Trajets conduits sans aucun geste déclaré : rien n'est attesté, ils disparaissent.
        r#"
            DELETE FROM trip t
            WHERE t.driver_id = $1
              AND NOT EXISTS (SELECT 1 FROM trip_event e WHERE e.trip_id = t.id)
        "#,
        // Inscriptions annulées ou à des trajets sans aucun geste déclaré.
        r#"
            DELETE FROM trip_member tm
            WHERE tm.user_id = $1
              AND (
                  tm.canceled_at IS NOT NULL
                  OR NOT EXISTS (SELECT 1 FROM trip_event e WHERE e.trip_id = tm.trip_id)
              )
        "#,
        r#"
            DELETE FROM trip_event e
            WHERE e.user_id = $1
              AND NOT EXISTS (SELECT 1 FROM trip t WHERE t.id = e.trip_id AND t.driver_id = $1)
              AND NOT EXISTS (
                  SELECT 1 FROM trip_member tm WHERE tm.trip_id = e.trip_id AND tm.user_id = $1
              )
        "#,
    ] {
        sqlx::query(statement)
            .bind(user_id)
            .execute(&mut *tx)
            .await?;
    }

    let has_attested_trips: bool = sqlx::query_scalar(
        r#"
            SELECT EXISTS (SELECT 1 FROM trip WHERE driver_id = $1)
                OR EXISTS (SELECT 1 FROM trip_member WHERE user_id = $1)
        "#,
    )
    .bind(user_id)
    .fetch_one(&mut *tx)
    .await?;

    let (phone, last_name): (String, Option<String>) =
        sqlx::query_as(r#"SELECT phone, last_name FROM "user" WHERE id = $1 FOR UPDATE"#)
            .bind(user_id)
            .fetch_one(&mut *tx)
            .await?;
    let proof_identity_key = last_name
        .filter(|_| has_attested_trips)
        .map(|last_name| identity_key(&phone, &last_name));
    let proof_phone_trunc = has_attested_trips.then(|| phone_trunc(&phone));

    sqlx::query(
        r#"
            UPDATE "user"
            SET phone = $2,
                pseudo = NULL,
                first_name = NULL,
                last_name = NULL,
                gender = 'Unspecified',
                picture_url = NULL,
                is_admin = false,
                is_signed_up = false,
                deleted_at = NOW(),
                proof_identity_key = $3,
                proof_phone_trunc = $4
            WHERE id = $1
        "#,
    )
    .bind(user_id)
    .bind(anonymous_phone())
    .bind(proof_identity_key)
    .bind(proof_phone_trunc)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(())
}

/// Comme un départ volontaire de chaque liane : les trajets à venir que l'utilisateur conduit sont
/// annulés (les passagers sont prévenus), ses inscriptions à venir retirées.
async fn leave_lianes(db: &PgPool, notifier: &Notifier, user_id: &Uuid) -> Result<()> {
    let liane_ids: Vec<Uuid> =
        sqlx::query_scalar("SELECT liane_id FROM liane_member WHERE user_id = $1")
            .bind(user_id)
            .fetch_all(db)
            .await?;
    for liane_id in liane_ids {
        liane::remove_member(db, &liane_id, user_id).await?;
        trip::service::withdraw_member(db, notifier, &liane_id, user_id).await?;
    }
    Ok(())
}

/// La colonne `phone` est unique et obligatoire : la coquille reçoit une valeur qui n'est pas un numéro.
/// Le vrai numéro redevient libre pour un nouveau compte.
fn anonymous_phone() -> String {
    format!("deleted-{}", &Uuid::new_v4().simple().to_string()[..12])
}
