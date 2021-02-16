#!/usr/bin/env bash

BASEDIR=$(dirname "$0")

dotnet run --project ${BASEDIR}/src/Liane/Liane.Web/Liane.Web.csproj
