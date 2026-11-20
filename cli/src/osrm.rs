use std::collections::HashMap;
use std::path::PathBuf;

use anyhow::{Context, Result, bail};
use reqwest::Url;
use tokio::fs::remove_file;
use tokio::net::TcpStream;
use tracing::{info, warn};

use crate::command::Command;
use crate::env::Env;
use crate::{command, local};

/// Environnement dont le serveur OSRM, déjà préparé, sert au développement local.
const OSRM_HOST_ENV: Env = Env::Dev;
const OSRM_CONTAINER_PORT: u16 = 5000;
const CONTAINER_IP_FORMAT: &str = "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}";

/// Tunnel SSH du port d'OSRM_URL vers le conteneur OSRM_TUNNEL, qui n'expose aucun port sur le serveur.
pub struct OsrmTunnel {
    container: String,
    local_port: u16,
}

impl OsrmTunnel {
    pub fn from_settings(settings: &HashMap<String, String>) -> Result<Option<Self>> {
        let Some(container) = settings.get("OSRM_TUNNEL").filter(|c| !c.is_empty()) else {
            return Ok(None);
        };
        let osrm_url = settings
            .get("OSRM_URL")
            .map(String::as_str)
            .unwrap_or_default();
        let local_port = Url::parse(osrm_url)
            .ok()
            .and_then(|url| url.port())
            .with_context(|| {
                format!("OSRM_TUNNEL needs an OSRM_URL with an explicit port, such as http://localhost:5001, got {osrm_url:?}")
            })?;
        Ok(Some(Self {
            container: container.clone(),
            local_port,
        }))
    }

    pub async fn open(&self) -> Result<()> {
        if TcpStream::connect(("127.0.0.1", self.local_port))
            .await
            .is_ok()
        {
            info!(
                "Port {} already in use, OSRM tunnel left as is",
                self.local_port
            );
            return Ok(());
        }
        let ip = self.container_ip().await?;
        let socket = control_socket();
        remove_file(&socket).await.ok();
        let forward = format!("127.0.0.1:{}:{ip}:{OSRM_CONTAINER_PORT}", self.local_port);
        local!(
            "ssh",
            "-M",
            "-S",
            &socket,
            "-f",
            "-N",
            "-o",
            "ExitOnForwardFailure=yes",
            "-L",
            &forward,
            OSRM_HOST_ENV.host()
        )
        .status()
        .await?;
        info!(
            "OSRM tunnel opened: localhost:{} -> {} on {}",
            self.local_port,
            self.container,
            OSRM_HOST_ENV.host()
        );
        Ok(())
    }

    async fn container_ip(&self) -> Result<String> {
        let output = command!(
            OSRM_HOST_ENV,
            "docker",
            "inspect",
            "--format",
            CONTAINER_IP_FORMAT,
            &self.container
        )
        .exec()
        .await
        .with_context(|| {
            format!(
                "OSRM container {} not found on {}",
                self.container,
                OSRM_HOST_ENV.host()
            )
        })?;
        let ip = output.trim();
        if ip.is_empty() {
            bail!("OSRM container {} has no IP address", self.container);
        }
        Ok(ip.to_string())
    }
}

pub async fn close_tunnel() {
    let socket = control_socket();
    if !PathBuf::from(&socket).exists() {
        return;
    }
    match local!("ssh", "-S", &socket, "-O", "exit", OSRM_HOST_ENV.host())
        .status()
        .await
    {
        Ok(_) => info!("OSRM tunnel closed"),
        Err(err) => {
            warn!("OSRM tunnel already gone: {err}");
            remove_file(&socket).await.ok();
        }
    }
}

fn control_socket() -> String {
    std::env::temp_dir()
        .join("liane-osrm-tunnel.sock")
        .to_string_lossy()
        .into_owned()
}
