FROM mcr.microsoft.com/dotnet/sdk:5.0 AS compiler

WORKDIR /app

COPY Liane.sln ./
COPY src/ ./src/

RUN dotnet restore && dotnet test && dotnet publish -c Release



FROM mcr.microsoft.com/dotnet/runtime:5.0
EXPOSE 8081

WORKDIR /app

COPY --from=compiler /app/src/Liane/Liane.Web/bin/Release/netcoreapp3.1/publish .

ENTRYPOINT [ "/app/Liane.Web" ]