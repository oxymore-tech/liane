use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// `Text` : écrit par un membre. Les autres sont ajoutés par le serveur quand il se passe
/// quelque chose dans la liane ; `text` contient alors la phrase à afficher.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
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

#[derive(Debug, FromRow)]
pub struct MessageRow {
    pub id: Uuid,
    pub liane_id: Uuid,
    pub user_id: Uuid,
    pub pseudo: Option<String>,
    pub kind: MessageKind,
    pub text: String,
    pub data: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

/// `data` porte `trip_id` pour les messages qui concernent un trajet.
#[derive(Debug, Clone, Serialize)]
pub struct Message {
    pub id: Uuid,
    pub liane_id: Uuid,
    pub author: MessageAuthor,
    pub kind: MessageKind,
    pub text: String,
    pub data: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MessageAuthor {
    pub id: Uuid,
    pub pseudo: Option<String>,
}

impl From<MessageRow> for Message {
    fn from(row: MessageRow) -> Self {
        Message {
            id: row.id,
            liane_id: row.liane_id,
            author: MessageAuthor {
                id: row.user_id,
                pseudo: row.pseudo,
            },
            kind: row.kind,
            text: row.text,
            data: row.data,
            created_at: row.created_at,
        }
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
