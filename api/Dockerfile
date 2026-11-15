# Image de l'API Liane. Contexte de construction : le dossier api/.
#   docker build -t liane-api api/
# Les migrations et les fichiers CSV des points de ralliement sont embarqués dans le binaire.

FROM rust:1-bookworm AS build
WORKDIR /build

# Les dépendances d'abord : cette couche ne change que si Cargo.toml ou Cargo.lock changent.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && touch src/lib.rs \
    && cargo build --release --locked \
    && rm -rf src

COPY src ./src
COPY migrations ./migrations
COPY resources ./resources
RUN touch src/main.rs src/lib.rs && cargo build --release --locked

FROM debian:bookworm-slim
# libssl3 : chiffrement des notifications Web Push. ca-certificates : appels HTTPS sortants (SMS, push).
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl3 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin liane

COPY --from=build /build/target/release/api /usr/local/bin/liane-api

USER 10001
WORKDIR /
ENV PORT=5000 LOG_FORMAT=json
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["liane-api", "--health"]
ENTRYPOINT ["liane-api"]
