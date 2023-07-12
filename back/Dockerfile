FROM mcr.microsoft.com/dotnet/sdk:7.0 AS compiler

WORKDIR /app

COPY Liane.sln ./
COPY src/ ./src/

RUN dotnet restore

RUN dotnet publish -c Release

FROM mcr.microsoft.com/dotnet/sdk:7.0 AS test

WORKDIR /app

COPY Liane.sln ./
COPY src/ ./src/

RUN dotnet restore

ENTRYPOINT [ "dotnet", "test", "--logger", "trx;LogFileName=/app/results/test-results.trx" ]

FROM mcr.microsoft.com/dotnet/aspnet:7.0
EXPOSE 5000

RUN apt-get update \
    && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=compiler /app/src/Liane/Liane.Web/bin/Release/net7.0/publish .

HEALTHCHECK --interval=5s --timeout=3s --retries=3 CMD curl --silent --fail http://localhost:5000/health || exit 1

ENTRYPOINT [ "/app/Liane.Web" ]