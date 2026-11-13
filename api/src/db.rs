use std::env::var;

use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;

use crate::error::Result;

pub async fn init_db() -> Result<PgPool> {
    let database_url = var("DATABASE_URL")?;

    let pool = PgPoolOptions::new()
        .max_connections(50)
        .connect(&database_url)
        .await?;

    sqlx::migrate!().run(&pool).await?;

    tracing::info!("Database connected and migrations applied");

    Ok(pool)
}
