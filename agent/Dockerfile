FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5001

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["WebChatAgent/WebChatAgent.csproj", "WebChatAgent/"]
RUN dotnet restore "WebChatAgent/WebChatAgent.csproj"
COPY . .
WORKDIR "/src/WebChatAgent"
RUN dotnet build -c Release -o /app/build

FROM build AS publish
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "WebChatAgent.dll"]
