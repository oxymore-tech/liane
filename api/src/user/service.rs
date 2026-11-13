use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::user::model::{PublicUser, UpdateUser, User};

pub async fn find(db: &PgPool, id: &Uuid) -> Result<Option<User>> {
    let user = sqlx::query_as::<_, User>(
        r#"
            SELECT
                id,
                phone,
                pseudo,
                first_name,
                last_name,
                gender,
                picture_url,
                is_admin,
                is_signed_up,
                created_at
            FROM "user"
            WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(db)
    .await?;
    Ok(user)
}

pub async fn find_public(db: &PgPool, id: &Uuid) -> Result<Option<PublicUser>> {
    let user = sqlx::query_as::<_, PublicUser>(
        r#"
            SELECT
                id,
                pseudo,
                gender,
                picture_url
            FROM "user"
            WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(db)
    .await?;
    Ok(user)
}

pub async fn update(db: &PgPool, id: &Uuid, update: &UpdateUser) -> Result<Option<User>> {
    let first_name = update.first_name.trim();
    let last_name = update.last_name.trim();
    let pseudo = build_pseudo(first_name, last_name).ok_or(AppError::BadRequest)?;

    let user = sqlx::query_as::<_, User>(
        r#"
            UPDATE "user"
            SET pseudo = $2,
                first_name = $3,
                last_name = $4,
                gender = $5,
                picture_url = $6,
                is_signed_up = true
            WHERE id = $1
            RETURNING
                id,
                phone,
                pseudo,
                first_name,
                last_name,
                gender,
                picture_url,
                is_admin,
                is_signed_up,
                created_at
        "#,
    )
    .bind(id)
    .bind(pseudo)
    .bind(first_name)
    .bind(last_name)
    .bind(&update.gender)
    .bind(&update.picture_url)
    .fetch_optional(db)
    .await?;
    Ok(user)
}

fn build_pseudo(first_name: &str, last_name: &str) -> Option<String> {
    if first_name.is_empty() {
        return None;
    }
    let initial = last_name.chars().next()?;
    Some(format!("{first_name} {}.", initial.to_uppercase()))
}

#[cfg(test)]
mod tests {
    use super::build_pseudo;

    #[test]
    fn pseudo_is_first_name_and_last_name_initial() {
        assert_eq!(build_pseudo("Augustin", "gjini"), Some("Augustin G.".to_string()));
    }

    #[test]
    fn pseudo_requires_both_names() {
        assert_eq!(build_pseudo("", "Gjini"), None);
        assert_eq!(build_pseudo("Augustin", ""), None);
    }
}
