use std::collections::HashMap;

use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::liane;
use crate::message::model::{Message, MessageKind, MessagePage, MessageQuery, MessageRow};
use crate::notification::Notifier;
use crate::notification::push::PushNotification;

const MAX_TEXT_LENGTH: usize = 2_000;
const DEFAULT_PAGE_SIZE: i64 = 30;
const MAX_PAGE_SIZE: i64 = 100;
const PUSH_BODY_LENGTH: usize = 120;

const MESSAGE_COLUMNS: &str = r#"
    m.id,
    m.liane_id,
    m.user_id,
    u.pseudo,
    m.content_type AS kind,
    m.content_value AS text,
    m.content_data AS data,
    m.created_at
"#;

pub async fn ensure_member(db: &PgPool, liane_id: &Uuid, user_id: &Uuid) -> Result<()> {
    if liane::is_member(db, liane_id, user_id).await? {
        Ok(())
    } else {
        Err(AppError::Forbidden)
    }
}

pub async fn list(
    db: &PgPool,
    liane_id: &Uuid,
    user_id: &Uuid,
    query: &MessageQuery,
) -> Result<MessagePage> {
    ensure_member(db, liane_id, user_id).await?;
    let limit = query
        .limit
        .unwrap_or(DEFAULT_PAGE_SIZE)
        .clamp(1, MAX_PAGE_SIZE);

    let rows = sqlx::query_as::<_, MessageRow>(&format!(
        r#"
            SELECT {MESSAGE_COLUMNS}
            FROM liane_message m
            INNER JOIN "user" u ON u.id = m.user_id
            WHERE m.liane_id = $1
              AND (
                  $2::uuid IS NULL
                  OR (m.created_at, m.id) < (
                      SELECT cursor.created_at, cursor.id
                      FROM liane_message cursor
                      WHERE cursor.id = $2
                        AND cursor.liane_id = $1
                  )
              )
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT $3
        "#
    ))
    .bind(liane_id)
    .bind(query.before)
    .bind(limit + 1)
    .fetch_all(db)
    .await?;

    let has_more = rows.len() as i64 > limit;
    Ok(MessagePage {
        messages: rows
            .into_iter()
            .take(limit as usize)
            .map(Message::from)
            .collect(),
        has_more,
    })
}

/// Message écrit par un membre : il part dans le fil, en direct, et en notification aux autres membres.
pub async fn post_text(
    db: &PgPool,
    notifier: &Notifier,
    liane_id: &Uuid,
    user_id: &Uuid,
    text: &str,
) -> Result<Message> {
    let text = text.trim();
    if text.is_empty() || text.chars().count() > MAX_TEXT_LENGTH {
        return Err(AppError::BadRequest);
    }
    ensure_member(db, liane_id, user_id).await?;

    let message = insert(
        db,
        notifier,
        liane_id,
        user_id,
        MessageKind::Text,
        text,
        None,
    )
    .await?;
    mark_read(db, liane_id, user_id).await?;

    let liane = liane::find_label(db, liane_id).await?;
    notifier.push(
        db,
        liane::find_member_ids_except(db, liane_id, user_id).await?,
        PushNotification {
            title: format!(
                "{} · {}",
                message.author.pseudo.as_deref().unwrap_or("Un membre"),
                liane.name
            ),
            body: shortened(text),
            url: format!("/l/{}/messages", liane.slug),
            tag: format!("liane-message-{liane_id}"),
        },
    );
    Ok(message)
}

/// Message automatique : `text` est la phrase affichée dans le fil.
pub async fn post_event(
    db: &PgPool,
    notifier: &Notifier,
    liane_id: &Uuid,
    actor_id: &Uuid,
    kind: MessageKind,
    text: &str,
    data: Option<serde_json::Value>,
) -> Result<Message> {
    insert(db, notifier, liane_id, actor_id, kind, text, data).await
}

pub async fn mark_read(db: &PgPool, liane_id: &Uuid, user_id: &Uuid) -> Result<()> {
    let updated = sqlx::query(
        "UPDATE liane_member SET last_read_at = NOW() WHERE liane_id = $1 AND user_id = $2",
    )
    .bind(liane_id)
    .bind(user_id)
    .execute(db)
    .await?;
    if updated.rows_affected() == 0 {
        return Err(AppError::Forbidden);
    }
    Ok(())
}

/// Messages des autres arrivés depuis la dernière lecture (ou depuis l'entrée dans la liane).
pub async fn unread_counts(db: &PgPool, user_id: &Uuid) -> Result<HashMap<Uuid, i64>> {
    let counts: Vec<(Uuid, i64)> = sqlx::query_as(
        r#"
            SELECT lm.liane_id, COUNT(m.id)
            FROM liane_member lm
            INNER JOIN liane_message m ON
                m.liane_id = lm.liane_id
                AND m.user_id <> lm.user_id
                AND m.created_at > COALESCE(lm.last_read_at, lm.joined_at)
            WHERE lm.user_id = $1
            GROUP BY lm.liane_id
        "#,
    )
    .bind(user_id)
    .fetch_all(db)
    .await?;
    Ok(counts.into_iter().collect())
}

async fn insert(
    db: &PgPool,
    notifier: &Notifier,
    liane_id: &Uuid,
    user_id: &Uuid,
    kind: MessageKind,
    text: &str,
    data: Option<serde_json::Value>,
) -> Result<Message> {
    let row = sqlx::query_as::<_, MessageRow>(&format!(
        r#"
            WITH m AS (
                INSERT INTO liane_message (liane_id, user_id, content_type, content_value, content_data)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            )
            SELECT {MESSAGE_COLUMNS}
            FROM m
            INNER JOIN "user" u ON u.id = m.user_id
        "#
    ))
    .bind(liane_id)
    .bind(user_id)
    .bind(kind)
    .bind(text)
    .bind(data)
    .fetch_one(db)
    .await?;

    let message = Message::from(row);
    notifier.publish_message(&message);
    Ok(message)
}

fn shortened(text: &str) -> String {
    if text.chars().count() <= PUSH_BODY_LENGTH {
        return text.to_string();
    }
    let start: String = text.chars().take(PUSH_BODY_LENGTH - 1).collect();
    format!("{start}…")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn long_texts_are_shortened_for_notifications() {
        assert_eq!(shortened("Bonjour"), "Bonjour");
        let long = "é".repeat(300);
        let short = shortened(&long);
        assert_eq!(short.chars().count(), PUSH_BODY_LENGTH);
        assert!(short.ends_with('…'));
    }
}
