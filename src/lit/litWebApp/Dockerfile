FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["litWebApp/litWebApp.csproj", "litWebApp/"]
RUN dotnet restore "litWebApp/litWebApp.csproj"
COPY . .
WORKDIR "/src/litWebApp"
RUN dotnet build "./litWebApp.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./litWebApp.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "litWebApp.dll"]

FROM nginx:alpine
COPY index.html /usr/share/nginx/html
EXPOSE 80