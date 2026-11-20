use std::collections::HashMap;
use std::ffi::OsStr;
use std::io::stdin;
use std::path::Path;

use crate::{command, local};
use anyhow::Result;
use itertools::Itertools;
use tokio::fs::{File, OpenOptions, read_to_string};
use tokio::io::AsyncWriteExt;
use tracing::info;

use crate::command::Command;
use crate::env::Env;
use crate::osrm::{OsrmTunnel, close_tunnel};

pub async fn start(env: Env, purge: bool) -> Result<()> {
    if env == Env::Local {
        ensure_env_file_exists(env).await?;
        if purge {
            let path = format!("{}/data", env.home());
            info!("Purging {:?}", path);
            local!("sudo", "rm", "-Rf", &path).status().await?;
        }
    } else {
        command!(env, "git", "-C", &env.home(), "pull")
            .status()
            .await?;
    }
    docker_compose(env, ["up", "-d", "--build", "--remove-orphans"])
        .status()
        .await?;
    if env == Env::Local {
        ensure_test_database(env).await?;
        if let Some(tunnel) = OsrmTunnel::from_settings(&env_file_settings(env).await?)? {
            tunnel.open().await?;
        }
    }
    info!("Liane {env} env started");
    Ok(())
}

pub async fn install(env: Env) -> Result<()> {
    command!(
        env,
        "git",
        "clone",
        "git@github.com:agjini/liane.git",
        &env.home()
    )
    .status()
    .await?;

    info!("Liane {env} env installed");
    Ok(())
}

/// Crée deploy/.env depuis deploy/.env.example, ou lui ajoute les variables qui lui manquent.
async fn ensure_env_file_exists(env: Env) -> Result<()> {
    let example = read_to_string(format!("{}/deploy/.env.example", env.home())).await?;
    let file = format!("{}/deploy/.env", env.home());
    let path = Path::new(&file);
    if !path.exists() {
        return create_env_file(path, &example).await;
    }
    let current = read_to_string(path).await?;
    let known = variables(&current).map(|(key, _)| key).collect_vec();
    let missing = variables(&example)
        .filter(|(key, _)| !known.contains(key))
        .collect_vec();
    if missing.is_empty() {
        return Ok(());
    }
    let mut dest = OpenOptions::new().append(true).open(path).await?;
    if !current.ends_with('\n') {
        dest.write_all(b"\n").await?;
    }
    for (key, value) in missing {
        info!("Adding {key}={value} to {file}");
        dest.write_all(format!("{key}={value}\n").as_bytes())
            .await?;
    }
    dest.flush().await?;
    Ok(())
}

async fn env_file_settings(env: Env) -> Result<HashMap<String, String>> {
    let content = read_to_string(format!("{}/deploy/.env", env.home())).await?;
    Ok(variables(&content)
        .map(|(key, value)| (key.to_string(), value.to_string()))
        .collect())
}

/// Les lignes `CLÉ=valeur` d'un fichier d'environnement, sans les commentaires.
fn variables(content: &str) -> impl Iterator<Item = (&str, &str)> {
    content
        .lines()
        .map(str::trim)
        .filter(|line| !line.starts_with('#'))
        .filter_map(|line| line.split_once('='))
}

async fn create_env_file(dest: &Path, example: &str) -> Result<()> {
    info!("Creating {:?}", dest);
    let mut dest = File::create(dest).await?;
    for (key, default_value) in variables(example) {
        println!("> Enter value for {key} : {default_value}");
        let mut value = String::new();
        stdin().read_line(&mut value)?;
        let value = value.trim();
        let value = if value.is_empty() {
            default_value
        } else {
            value
        };
        dest.write_all(format!("{key}={value}\n").as_bytes())
            .await?;
    }
    dest.flush().await?;
    Ok(())
}

/// Base des tests d'intégration (TEST_DATABASE_URL), créée une fois le serveur prêt.
async fn ensure_test_database(env: Env) -> Result<()> {
    let script = "for i in $(seq 60); do pg_isready -q -h 127.0.0.1 -U liane -d liane && break; sleep 1; done; \
        psql -h 127.0.0.1 -U liane -d liane -Atc \"SELECT 1 FROM pg_database WHERE datname = 'liane_test'\" | grep -q 1 \
        || createdb -h 127.0.0.1 -U liane liane_test";
    docker_compose(env, ["exec", "-T", "postgres", "sh", "-c", script])
        .status()
        .await?;
    Ok(())
}

/// Jeu de démonstration : points de ralliement de test, quatre lianes en Lozère, membres, messages et trajets.
/// L'API doit tourner, avec le compte de démonstration activé.
pub async fn seed() -> Result<()> {
    local!("node", "deploy/demo/seed-lianes.mjs")
        .status()
        .await?;
    local!("node", "deploy/demo/seed-trips.mjs")
        .status()
        .await?;
    Ok(())
}

pub async fn dump(env: Env) -> Result<()> {
    docker_compose(
        env,
        [
            "exec",
            "postgres",
            "pg_dumpall",
            "--clean",
            "-U",
            "liane",
            "--exclude-database=postgres",
            "--no-role-passwords",
        ],
    )
    .pipe(&docker_compose(
        Env::Local,
        ["exec", "-T", "postgres", "psql", "-U", "liane", "liane"],
    ))
    .exec()
    .await?;
    info!("Liane {env} env dumped to local");
    Ok(())
}

pub async fn stop(env: Env) -> Result<()> {
    docker_compose(env, ["down"]).status().await?;
    if env == Env::Local {
        close_tunnel().await;
    }
    info!("Liane {env} env stopped");
    Ok(())
}

fn docker_compose<I, S>(env: Env, args: I) -> Command
where
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    let project = env.project();
    let file = format!("{}/deploy/{}", env.home(), env.compose_file());
    let mut cmd = Command::new(env, "docker");
    cmd.args(["compose", "-p", &project, "-f", &file]);
    cmd.args(args);
    cmd
}
