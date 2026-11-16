use sqlx::PgPool;
use sqlx::migrate::Migrator;
use sqlx::postgres::PgPoolOptions;

use crate::error::Result;

pub static MIGRATOR: Migrator = sqlx::migrate!();

pub async fn init_db(database_url: &str) -> Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(50)
        .connect(database_url)
        .await?;

    MIGRATOR.run(&pool).await?;

    tracing::info!("Database connected and migrations applied");

    Ok(pool)
}

/// Vrai si toutes les migrations embarquées dans le binaire sont appliquées.
pub async fn migrations_applied(db: &PgPool) -> Result<bool> {
    let applied: Vec<i64> =
        sqlx::query_scalar("SELECT version FROM _sqlx_migrations WHERE success")
            .fetch_all(db)
            .await?;
    Ok(MIGRATOR
        .iter()
        .all(|migration| applied.contains(&migration.version)))
}
