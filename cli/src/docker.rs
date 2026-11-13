use std::ffi::OsStr;
use std::io::stdin;
use std::path::Path;

use crate::{command, local};
use anyhow::Result;
use itertools::Itertools;
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tracing::info;

use crate::command::Command;
use crate::env::Env;

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

async fn ensure_env_file_exists(env: Env) -> Result<()> {
    let file = format!("{}/deploy/.env", env.home());
    let path = Path::new(&file);
    if path.exists() {
        Ok(())
    } else {
        create_env_file(env).await
    }
}

async fn create_env_file(env: Env) -> Result<()> {
    info!("Creating env file for {:?}", env);
    let example_file = format!("{}/deploy/.env.example", env.home());
    let env_file = format!("{}/deploy/.env", env.home());
    let source = Path::new(&example_file);
    let dest = Path::new(&env_file);

    let source = File::open(source).await?;

    let mut lines = BufReader::new(source).lines();

    let mut dest = File::create(dest).await?;
    while let Some(line) = lines.next_line().await? {
        let parts = line.split('=').collect_vec();
        if parts.len() == 2 {
            let key = parts[0];
            let default_value = parts[1];
            println!("> Enter value for {key} : {default_value}");
            let mut value = String::new();
            stdin().read_line(&mut value)?;
            let user_value = if value == "\n" {
                default_value
            } else {
                value.trim()
            };
            let line = format!("{}={}\n", key, user_value);
            dest.write_all(line.as_bytes()).await?;
        }
    }

    dest.flush().await?;
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
