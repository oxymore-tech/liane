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

ENTRYPOINT [ "dotnet" , "test" ]

FROM mcr.microsoft.com/dotnet/aspnet:7.0
EXPOSE 5000

WORKDIR /app

COPY --from=compiler /app/src/Liane/Liane.Web/bin/Release/net7.0/publish .

ENTRYPOINT [ "/app/Liane.Web" ]