FROM mcr.microsoft.com/dotnet/core/sdk:3.1 AS compiler

WORKDIR /app

COPY Liane.sln ./
COPY src/ ./src/

RUN dotnet restore && dotnet test && dotnet publish -c Release



FROM mcr.microsoft.com/dotnet/core/aspnet:3.1.4
EXPOSE 8081

WORKDIR /app

COPY --from=compiler /app/src/Liane/Liane.Web/bin/Release/netcoreapp3.1/publish .

ENTRYPOINT [ "/app/Liane.Web" ]