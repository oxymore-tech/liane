use std::io;

use anyhow::Result;
use clap::{Command, CommandFactory, Parser, Subcommand};
use clap_complete::{Generator, Shell, generate};
use tracing::{Level, error};

use cli::docker::{dump, install, start, stop};
use cli::env::Env;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None, name = "liane")]
/// Liane CLI : for local, dev and prod purposes
pub struct Cli {
    #[arg(long, short, global = true)]
    debug: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Print shell completion (auto-detects shell, or specify: bash, fish, zsh, etc.)
    Completion {
        #[arg(value_enum)]
        shell: Option<Shell>,
    },

    /// Install liane env
    Install {
        #[arg(default_value_t = Env::Local)]
        env: Env,
    },

    /// Start liane env
    Start {
        #[arg(default_value_t = Env::Local)]
        env: Env,
        #[arg(long, short = 'p', default_value_t = false)]
        /// Purge local data (only for local env)
        purge: bool,
    },

    /// Stop liane env
    Stop {
        #[arg(default_value_t = Env::Local)]
        env: Env,
    },

    /// Dump remote database to local
    Dump {
        #[arg(default_value_t = Env::Dev)]
        env: Env,
    },
}

#[tokio::main]
async fn main() {
    if let Err(err) = try_main().await {
        error!("{}", err);
        err.chain().for_each(|cause| error!("because: {}", cause));
        std::process::exit(1);
    }
}

async fn try_main() -> Result<()> {
    let cli = Cli::parse();

    configure_logger(&cli)?;

    match cli.command {
        Commands::Completion { shell } => {
            let shell = shell.or_else(detect_shell).unwrap_or(Shell::Bash);
            print_completion(shell, &mut Cli::command());
        }

        Commands::Install { env } => install(env).await?,

        Commands::Start { env, purge } => start(env, purge).await?,

        Commands::Stop { env } => stop(env).await?,

        Commands::Dump { env } => {
            dump(env).await?;
        }
    };

    Ok(())
}

fn configure_logger(cli: &Cli) -> Result<()> {
    let subscriber = tracing_subscriber::fmt()
        .with_max_level(if cli.debug { Level::DEBUG } else { Level::INFO })
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;
    Ok(())
}

fn detect_shell() -> Option<Shell> {
    std::env::var("SHELL").ok().and_then(|s| {
        let name = std::path::Path::new(&s).file_name()?.to_str()?;
        name.parse().ok()
    })
}

fn print_completion<G: Generator>(g: G, cmd: &mut Command) {
    generate(g, cmd, cmd.get_name().to_string(), &mut io::stdout());
}
