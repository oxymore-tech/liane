use std::fmt::{Display, Formatter};

use clap::ValueEnum;
use dns_lookup::lookup_host;
use tracing::debug;

#[derive(ValueEnum, Eq, PartialEq, Clone, Copy, Debug, Hash)]
pub enum Env {
    Local,
    Dev,
    Prod,
}

impl Env {
    pub fn is_remote(&self) -> bool {
        let host = self.host();
        debug!("Looking up IPs for {:?}", host);
        let ips = lookup_host(host).unwrap().collect::<Vec<_>>();
        debug!("IPs for {:?}: {:?}", self.host(), ips);
        !ips.contains(&"127.0.0.1".parse().unwrap())
    }

    pub fn home(&self) -> String {
        if let Ok(h) = std::env::var("LIANE_HOME") {
            return h;
        }
        let user_home = std::env::var("SUDO_USER")
            .ok()
            .map(|u| format!("/home/{}", u))
            .unwrap_or_else(|| std::env::var("HOME").expect("HOME env var is not set"));
        match &self {
            Env::Local => format!("{user_home}/workspace/perso/liane"),
            Env::Dev => "/home/ubuntu/liane-dev".to_string(),
            Env::Prod => "/home/ubuntu/liane-prod".to_string(),
        }
    }

    pub fn project(&self) -> String {
        format!("liane-{self}")
    }

    pub fn host(&self) -> &'static str {
        match &self {
            Env::Local => "localhost",
            Env::Dev => "gjini.co",
            Env::Prod => "gjini.co",
        }
    }

    pub fn compose_file(&self) -> &'static str {
        match &self {
            Env::Local => "local.yml",
            _ => "liane.yml",
        }
    }
}

impl Display for Env {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Env::Local => write!(f, "local"),
            Env::Dev => write!(f, "dev"),
            Env::Prod => write!(f, "prod"),
        }
    }
}
