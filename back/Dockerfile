FROM mcr.microsoft.com/dotnet/sdk:6.0 AS compiler

WORKDIR /app

COPY Liane.sln ./
COPY src/ ./src/

RUN dotnet restore && dotnet test --filter Category\!=Integration && dotnet publish -c Release



FROM mcr.microsoft.com/dotnet/aspnet:6.0
EXPOSE 5000

WORKDIR /app

COPY --from=compiler /app/src/Liane/Liane.Web/bin/Release/net6.0/publish .

ENTRYPOINT [ "/app/Liane.Web" ]