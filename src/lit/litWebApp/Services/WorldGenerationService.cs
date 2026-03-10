using litWebApp.Models;
using litWebApp.Models.DbModels;
using Microsoft.EntityFrameworkCore;

namespace litWebApp.Services;

public static class WorldGenerationService
{
    // World bounds - easy to change
    public const float WorldMinX = -5000f;
    public const float WorldMaxX = 5000f;
    public const float WorldMinY = -5000f;
    public const float WorldMaxY = 5000f;

    private const int MinPlanets = 8;
    private const int MaxPlanets = 15;
    private const int MinStations = 20;
    private const int MaxStations = 40;
    private const float PlanetInfluenceRadius = 4000f;
    private const float DistancePriceMultiplier = 2.0f;

    private static readonly string[] Adjectives =
    {
        "Crimson", "Iron", "Silver", "Dark", "Bright", "Frozen", "Burning",
        "Hollow", "Golden", "Silent", "Shattered", "Azure", "Obsidian",
        "Scarlet", "Ashen", "Void", "Stellar", "Amber", "Pale", "Deep"
    };

    private static readonly string[] Nouns =
    {
        "Reach", "Terminal", "Outpost", "Hub", "Port", "Dock", "Station",
        "Gateway", "Anchorage", "Depot", "Haven", "Spire", "Citadel",
        "Bastion", "Landing", "Platform", "Forge", "Exchange", "Nexus", "Keep"
    };

    private static readonly string[] PlanetPrefixes =
    {
        "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta",
        "Theta", "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron"
    };

    public static async Task GenerateWorldAsync(AppDbContext db)
    {
        if (await db.Stations.AnyAsync()) return;

        var cargoTypes = await db.CargoTypes.ToListAsync();
        var shipTypes = await db.ShipTypes.ToListAsync();

        if (cargoTypes.Count == 0 || shipTypes.Count == 0) return;

        var rng = new Random();

        // Generate planets
        var planetCount = rng.Next(MinPlanets, MaxPlanets + 1);
        var planets = new List<PlanetModel>();

        for (int i = 0; i < planetCount; i++)
        {
            var planet = new PlanetModel
            {
                Name = $"{PlanetPrefixes[i % PlanetPrefixes.Length]}-{rng.Next(100, 999)}",
                CoordinateX = RandomInRange(rng, WorldMinX * 0.8f, WorldMaxX * 0.8f),
                CoordinateY = RandomInRange(rng, WorldMinY * 0.8f, WorldMaxY * 0.8f),
                CargoTypeId = cargoTypes[rng.Next(cargoTypes.Count)].Id
            };
            planets.Add(planet);
        }

        db.Planets.AddRange(planets);
        await db.SaveChangesAsync();

        // Generate stations
        var stationCount = rng.Next(MinStations, MaxStations + 1);
        var stations = new List<StationModel>();
        var usedNames = new HashSet<string>();

        for (int i = 0; i < stationCount; i++)
        {
            string name;
            do
            {
                name = $"{Adjectives[rng.Next(Adjectives.Length)]} {Nouns[rng.Next(Nouns.Length)]}";
            } while (!usedNames.Add(name));

            var station = new StationModel
            {
                Name = name,
                CoordinateX = RandomInRange(rng, WorldMinX * 0.9f, WorldMaxX * 0.9f),
                CoordinateY = RandomInRange(rng, WorldMinY * 0.9f, WorldMaxY * 0.9f),
                HangarLimit = rng.Next(3, 9)
            };
            stations.Add(station);
        }

        db.Stations.AddRange(stations);
        await db.SaveChangesAsync();

        // Link planets to stations and calculate prices
        var planetAffections = new List<PlanetAffectingStationModel>();
        var cargoValues = new List<CargoTypeValueModel>();

        float maxWorldDist = MathF.Sqrt(
            MathF.Pow(WorldMaxX - WorldMinX, 2) + MathF.Pow(WorldMaxY - WorldMinY, 2));

        foreach (var station in stations)
        {
            // Find planets in influence radius
            var nearbyPlanets = planets
                .Where(p => Distance(p.CoordinateX, p.CoordinateY, station.CoordinateX, station.CoordinateY) < PlanetInfluenceRadius)
                .ToList();

            foreach (var planet in nearbyPlanets)
            {
                planetAffections.Add(new PlanetAffectingStationModel
                {
                    PlanetId = planet.Id,
                    StationId = station.Id
                });
            }

            // Calculate prices for each cargo type
            foreach (var cargoType in cargoTypes)
            {
                // Find nearest planet that produces this cargo type
                var producerPlanets = planets.Where(p => p.CargoTypeId == cargoType.Id).ToList();

                decimal price;
                if (producerPlanets.Count == 0)
                {
                    // No producer - very expensive import price
                    price = cargoType.BasePrice * 3.5m;
                }
                else
                {
                    var minDist = producerPlanets
                        .Min(p => Distance(p.CoordinateX, p.CoordinateY, station.CoordinateX, station.CoordinateY));
                    var distFactor = (decimal)(minDist / maxWorldDist) * (decimal)DistancePriceMultiplier;
                    price = cargoType.BasePrice * (1m + distFactor);
                }

                // Add some random variance (+/- 10%)
                var variance = 0.9m + (decimal)(rng.NextDouble() * 0.2);
                price = Math.Round(price * variance, 2);

                cargoValues.Add(new CargoTypeValueModel
                {
                    CargoTypeId = cargoType.Id,
                    StationId = station.Id,
                    Value = price
                });
            }
        }

        db.PlanetAffectingStations.AddRange(planetAffections);
        db.CargoTypeValues.AddRange(cargoValues);
        await db.SaveChangesAsync();

        // Assign ship stock to stations
        var shipStocks = new List<StationShipStockModel>();
        foreach (var station in stations)
        {
            var stockCount = rng.Next(2, 6);
            var availableTypes = shipTypes.OrderBy(_ => rng.Next()).Take(stockCount).ToList();

            foreach (var shipType in availableTypes)
            {
                shipStocks.Add(new StationShipStockModel
                {
                    StationId = station.Id,
                    ShipTypeId = shipType.Id,
                    StockCount = rng.Next(1, 4)
                });
            }
        }

        db.StationShipStocks.AddRange(shipStocks);
        await db.SaveChangesAsync();
    }

    private static float RandomInRange(Random rng, float min, float max)
    {
        return (float)(rng.NextDouble() * (max - min) + min);
    }

    private static float Distance(float x1, float y1, float x2, float y2)
    {
        return MathF.Sqrt(MathF.Pow(x2 - x1, 2) + MathF.Pow(y2 - y1, 2));
    }
}
