use std::ffi::OsStr;
use std::process::Stdio;

use anyhow::{Error, Result};
use serde::de::DeserializeOwned;
use tokio::process::Command as TokioCommand;
use tracing::debug;

use crate::env::Env;

#[derive(Debug, Clone, Hash)]
pub struct CommandArgs {
    target_env: Env,
    program: String,
    args: Vec<String>,
}

#[derive(Debug, Clone, Hash)]
pub enum Command {
    Atomic {
        command: CommandArgs,
    },
    Piped {
        from: Box<Command>,
        command: CommandArgs,
    },
}

impl From<CommandArgs> for TokioCommand {
    fn from(args: CommandArgs) -> TokioCommand {
        (&args).into()
    }
}

impl From<&CommandArgs> for TokioCommand {
    fn from(args: &CommandArgs) -> TokioCommand {
        let is_remote = args.target_env.is_remote();
        debug!(
            "Executing {:?} on {:?}. Remote = {is_remote}",
            args.program, args.target_env
        );
        let cmd = if is_remote {
            Command::build_remote_command(&args.target_env, &args.program, &args.args)
        } else {
            Command::build_local_command(&args.target_env, &args.program, &args.args)
        };
        debug!("RUN {:?}", cmd);
        cmd
    }
}

impl From<&Command> for TokioCommand {
    fn from(value: &Command) -> Self {
        match value {
            Command::Atomic { command } => command.into(),
            Command::Piped { from, command } => {
                let mut from: TokioCommand = from.as_ref().into();
                from.stdout(Stdio::piped());
                let mut to: TokioCommand = command.into();
                let from_stdout: Stdio = from
                    .spawn()
                    .expect("Unable to spawn command")
                    .stdout
                    .take()
                    .expect("from.stdout")
                    .try_into()
                    .expect("from.stdout into Stdio");
                to.stdin(from_stdout);
                to
            }
        }
    }
}

impl From<Command> for TokioCommand {
    fn from(value: Command) -> Self {
        (&value).into()
    }
}

impl Command {
    pub fn local(program: &str) -> Self {
        Self::new(Env::Local, program)
    }

    pub fn new(target_env: Env, program: &str) -> Self {
        Command::Atomic {
            command: CommandArgs {
                target_env,
                program: program.to_string(),
                args: vec![],
            },
        }
    }

    pub fn arg(&mut self, arg: &str) -> &mut Self {
        match self {
            Command::Atomic { command } => command.args.push(arg.to_string()),
            Command::Piped { command, .. } => command.args.push(arg.to_string()),
        }
        self
    }

    pub fn args<I, S>(&mut self, args: I) -> &mut Command
    where
        I: IntoIterator<Item = S>,
        S: AsRef<OsStr>,
    {
        for arg in args {
            self.arg(arg.as_ref().to_str().unwrap());
        }
        self
    }

    pub async fn status(&self) -> Result<i32> {
        let mut command: TokioCommand = self.into();
        let status = command.status().await?;
        if status.success() {
            Ok(status.code().unwrap_or(0))
        } else {
            Err(Error::msg(format!(
                "Command {:?} failed with status {:?}",
                command, status
            )))
        }
    }

    pub async fn exec(&self) -> Result<String> {
        let result = self.exec_internal().await?;
        Ok(String::from_utf8(result)?)
    }

    pub async fn exec_as<T>(&self) -> Result<T>
    where
        T: DeserializeOwned,
    {
        let result = self.exec_internal().await?;
        Ok(serde_json::from_slice::<T>(&result)?)
    }

    pub fn pipe(&self, command: &Command) -> Command {
        match command {
            Command::Atomic { command } => Command::Piped {
                from: Box::new(self.clone()),
                command: command.clone(),
            },
            Command::Piped { from, command } => Command::Piped {
                from: from.clone(),
                command: command.clone(),
            },
        }
    }

    async fn exec_internal(&self) -> Result<Vec<u8>> {
        let mut command: TokioCommand = self.into();
        let output = command.output().await?;
        if output.status.success() {
            Ok(output.stdout)
        } else {
            Err(Error::msg(String::from_utf8(output.stderr)?))
        }
    }

    fn build_local_command(target_env: &Env, command: &str, args: &Vec<String>) -> TokioCommand {
        let mut cmd = TokioCommand::new(command);
        cmd.args(args)
            .current_dir(target_env.home())
            .env("LIANE_HOME", target_env.home());
        cmd
    }

    fn build_remote_command(target_env: &Env, command: &str, args: &[String]) -> TokioCommand {
        let mut cmd = TokioCommand::new("ssh");
        cmd.args(["-t", "-o", "LogLevel=QUIET"])
            .arg(target_env.host())
            .arg(format!("LIANE_HOME=\"{home}\"", home = target_env.home()))
            .arg(format!("PROJECT={}", target_env.project()))
            .arg(command)
            .args(args.iter().map(|s| format!("\"{s}\"")));
        cmd
    }
}

#[macro_export]
macro_rules! local {
    ( $program:expr,$( $arg:expr ),* ) => {
        {
            let mut cmd = Command::local($program);
            $(
                cmd.arg($arg);
            )*
            cmd
        }
    };
}

#[macro_export]
macro_rules! command {
    ($env:expr,$program:expr,$( $arg:expr ),*) => {
        {
            let mut cmd = Command::new($env, $program);
            $(
                cmd.arg($arg);
            )*
            cmd
        }
    };
}
