use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use sqlx::types::Json;
use uuid::Uuid;

use crate::error::AppError;

/// Colonne `content_type` : l'étiquette de `MessageContent` telle qu'elle est stockée.
#[derive(Debug, Clone, Copy, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "VARCHAR")]
#[sqlx(rename_all = "PascalCase")]
pub enum MessageKind {
    Text,
    MemberJoined,
    MemberLeft,
    TripProposed,
    TripCanceled,
    TripStarted,
    TripFinished,
}

/// Le trajet dont parle un message automatique (colonne `content_data`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TripReference {
    pub trip_id: Uuid,
    pub departure_time: DateTime<Utc>,
}

/// `Text` : écrit par un membre. Les autres sont ajoutés par le serveur quand il se passe
/// quelque chose dans la liane. En JSON : `kind` porte la variante, et `data` le trajet
/// pour les variantes qui en ont un.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "kind", content = "data")]
pub enum MessageContent {
    Text,
    MemberJoined,
    MemberLeft,
    TripProposed(TripReference),
    TripCanceled(TripReference),
    TripStarted(TripReference),
    TripFinished(TripReference),
}

impl MessageContent {
    pub fn kind(&self) -> MessageKind {
        match self {
            MessageContent::Text => MessageKind::Text,
            MessageContent::MemberJoined => MessageKind::MemberJoined,
            MessageContent::MemberLeft => MessageKind::MemberLeft,
            MessageContent::TripProposed(_) => MessageKind::TripProposed,
            MessageContent::TripCanceled(_) => MessageKind::TripCanceled,
            MessageContent::TripStarted(_) => MessageKind::TripStarted,
            MessageContent::TripFinished(_) => MessageKind::TripFinished,
        }
    }

    pub fn trip(&self) -> Option<&TripReference> {
        match self {
            MessageContent::Text | MessageContent::MemberJoined | MessageContent::MemberLeft => {
                None
            }
            MessageContent::TripProposed(trip)
            | MessageContent::TripCanceled(trip)
            | MessageContent::TripStarted(trip)
            | MessageContent::TripFinished(trip) => Some(trip),
        }
    }

    fn from_columns(kind: MessageKind, trip: Option<TripReference>) -> Option<Self> {
        Some(match kind {
            MessageKind::Text => MessageContent::Text,
            MessageKind::MemberJoined => MessageContent::MemberJoined,
            MessageKind::MemberLeft => MessageContent::MemberLeft,
            MessageKind::TripProposed => MessageContent::TripProposed(trip?),
            MessageKind::TripCanceled => MessageContent::TripCanceled(trip?),
            MessageKind::TripStarted => MessageContent::TripStarted(trip?),
            MessageKind::TripFinished => MessageContent::TripFinished(trip?),
        })
    }
}

#[derive(Debug, FromRow)]
pub struct MessageRow {
    pub id: Uuid,
    pub liane_id: Uuid,
    pub user_id: Uuid,
    pub pseudo: Option<String>,
    pub kind: MessageKind,
    pub text: String,
    pub data: Option<Json<TripReference>>,
    pub created_at: DateTime<Utc>,
}

/// `text` est la phrase à afficher, quel que soit le contenu.
#[derive(Debug, Clone, Serialize)]
pub struct Message {
    pub id: Uuid,
    pub liane_id: Uuid,
    pub author: MessageAuthor,
    #[serde(flatten)]
    pub content: MessageContent,
    pub text: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MessageAuthor {
    pub id: Uuid,
    pub pseudo: Option<String>,
}

impl TryFrom<MessageRow> for Message {
    type Error = AppError;

    fn try_from(row: MessageRow) -> Result<Self, Self::Error> {
        let trip = row.data.map(|Json(trip)| trip);
        let content = MessageContent::from_columns(row.kind, trip).ok_or_else(|| {
            AppError::Unexpected(format!(
                "message {} of kind {:?} has no trip",
                row.id, row.kind
            ))
        })?;
        Ok(Message {
            id: row.id,
            liane_id: row.liane_id,
            author: MessageAuthor {
                id: row.user_id,
                pseudo: row.pseudo,
            },
            content,
            text: row.text,
            created_at: row.created_at,
        })
    }
}

/// Du plus récent au plus ancien. `has_more` : il reste des messages plus anciens,
/// à demander avec `before` = l'identifiant du dernier message reçu.
#[derive(Debug, Serialize)]
pub struct MessagePage {
    pub messages: Vec<Message>,
    pub has_more: bool,
}

#[derive(Debug, Deserialize)]
pub struct MessageQuery {
    pub before: Option<Uuid>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct MessageInput {
    pub text: String,
}

#[cfg(test)]
mod tests {
    use chrono::TimeZone;
    use serde_json::json;

    use super::*;

    fn trip() -> TripReference {
        TripReference {
            trip_id: Uuid::nil(),
            departure_time: Utc.with_ymd_and_hms(2026, 11, 16, 6, 30, 0).unwrap(),
        }
    }

    #[test]
    fn a_trip_message_carries_its_trip_under_data() {
        assert_eq!(
            serde_json::to_value(MessageContent::TripProposed(trip())).unwrap(),
            json!({
                "kind": "TripProposed",
                "data": {
                    "trip_id": "00000000-0000-0000-0000-000000000000",
                    "departure_time": "2026-11-16T06:30:00Z",
                },
            })
        );
        assert_eq!(
            serde_json::to_value(MessageContent::Text).unwrap(),
            json!({ "kind": "Text" })
        );
    }

    #[test]
    fn a_stored_trip_reference_is_read_back() {
        let stored = r#"{"trip_id": "00000000-0000-0000-0000-000000000000", "departure_time": "2026-11-16T06:30:00Z"}"#;
        assert_eq!(
            serde_json::from_str::<TripReference>(stored).unwrap(),
            trip()
        );
    }

    #[test]
    fn stored_columns_give_back_the_content() {
        for content in [
            MessageContent::Text,
            MessageContent::MemberLeft,
            MessageContent::TripStarted(trip()),
        ] {
            let read = MessageContent::from_columns(content.kind(), content.trip().cloned());
            assert_eq!(read, Some(content));
        }
        assert_eq!(
            MessageContent::from_columns(MessageKind::TripCanceled, None),
            None
        );
    }
}
