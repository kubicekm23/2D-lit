FROM  AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080

FROM  AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["litWebApp.csproj", "./"]
RUN dotnet restore "./litWebApp.csproj"
COPY . .
RUN dotnet build "./litWebApp.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./litWebApp.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "litWebApp.dll"]