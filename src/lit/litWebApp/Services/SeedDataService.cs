using litWebApp.Models;
using litWebApp.Models.DbModels;
using Microsoft.EntityFrameworkCore;

namespace litWebApp.Services;

public static class SeedDataService
{
    public static async Task SeedAsync(AppDbContext db)
    {
        await SeedShipTypesAsync(db);
        await SeedCargoTypesAsync(db);
    }

    private static async Task SeedShipTypesAsync(AppDbContext db)
    {
        if (await db.ShipTypes.AnyAsync()) return;

        var shipTypes = new List<ShipTypeModel>
        {
            new() { Name = "Sidewinder",        CargoHold = 4,   MaxSpeed = 200, ThrustPower = 80,  FuelEfficiency = 1.0f,  TurnRate = 120, MaxPaliva = 20,  Price = 0,       PathToTextures = "img/ships/sidewinder.png",       Description = "A nimble starter craft. Cheap, cheerful, expendable." },
            new() { Name = "Hauler",             CargoHold = 8,   MaxSpeed = 180, ThrustPower = 70,  FuelEfficiency = 0.9f,  TurnRate = 110, MaxPaliva = 25,  Price = 5000,    PathToTextures = "img/ships/hauler.png",            Description = "Budget freighter for short-range hauls." },
            new() { Name = "Adder",              CargoHold = 12,  MaxSpeed = 170, ThrustPower = 65,  FuelEfficiency = 0.85f, TurnRate = 100, MaxPaliva = 30,  Price = 12000,   PathToTextures = "img/ships/adder.png",             Description = "Versatile multirole ship with decent cargo." },
            new() { Name = "Cobra Mk III",       CargoHold = 18,  MaxSpeed = 220, ThrustPower = 90,  FuelEfficiency = 0.8f,  TurnRate = 105, MaxPaliva = 35,  Price = 30000,   PathToTextures = "img/ships/cobra-mk3.png",         Description = "The iconic multipurpose vessel. Fast and roomy." },
            new() { Name = "Viper",              CargoHold = 6,   MaxSpeed = 260, ThrustPower = 110, FuelEfficiency = 1.2f,  TurnRate = 130, MaxPaliva = 20,  Price = 25000,   PathToTextures = "img/ships/viper.png",             Description = "Speed demon with razor-thin cargo bay." },
            new() { Name = "Type-6 Transporter", CargoHold = 50,  MaxSpeed = 140, ThrustPower = 50,  FuelEfficiency = 0.7f,  TurnRate = 70,  MaxPaliva = 40,  Price = 50000,   PathToTextures = "img/ships/type6.png",             Description = "Dedicated hauler. Slow but carries a fortune." },
            new() { Name = "Asp Explorer",       CargoHold = 28,  MaxSpeed = 210, ThrustPower = 85,  FuelEfficiency = 0.75f, TurnRate = 95,  MaxPaliva = 50,  Price = 90000,   PathToTextures = "img/ships/asp-explorer.png",      Description = "Long-range explorer with generous fuel tanks." },
            new() { Name = "Keelback",           CargoHold = 38,  MaxSpeed = 150, ThrustPower = 55,  FuelEfficiency = 0.8f,  TurnRate = 75,  MaxPaliva = 35,  Price = 60000,   PathToTextures = "img/ships/keelback.png",          Description = "Rugged trader built to take a beating." },
            new() { Name = "Python",             CargoHold = 56,  MaxSpeed = 180, ThrustPower = 75,  FuelEfficiency = 0.65f, TurnRate = 80,  MaxPaliva = 60,  Price = 200000,  PathToTextures = "img/ships/python.png",            Description = "Heavy multipurpose. The king of medium pads." },
            new() { Name = "Krait Mk II",        CargoHold = 32,  MaxSpeed = 230, ThrustPower = 95,  FuelEfficiency = 0.7f,  TurnRate = 100, MaxPaliva = 55,  Price = 180000,  PathToTextures = "img/ships/krait-mk2.png",         Description = "Fast, agile, and surprisingly spacious." },
            new() { Name = "Type-9 Heavy",       CargoHold = 120, MaxSpeed = 100, ThrustPower = 35,  FuelEfficiency = 0.6f,  TurnRate = 45,  MaxPaliva = 70,  Price = 350000,  PathToTextures = "img/ships/type9.png",             Description = "A flying warehouse. Don't expect to dodge anything." },
            new() { Name = "Imperial Clipper",   CargoHold = 42,  MaxSpeed = 250, ThrustPower = 100, FuelEfficiency = 0.65f, TurnRate = 90,  MaxPaliva = 65,  Price = 500000,  PathToTextures = "img/ships/imperial-clipper.png",  Description = "Elegant, fast, and unmistakably Imperial." },
            new() { Name = "Federal Corvette",   CargoHold = 60,  MaxSpeed = 200, ThrustPower = 85,  FuelEfficiency = 0.55f, TurnRate = 65,  MaxPaliva = 80,  Price = 800000,  PathToTextures = "img/ships/federal-corvette.png",  Description = "Federal engineering at its finest. Built like a tank." },
            new() { Name = "Anaconda",           CargoHold = 80,  MaxSpeed = 160, ThrustPower = 60,  FuelEfficiency = 0.5f,  TurnRate = 50,  MaxPaliva = 100, Price = 1200000, PathToTextures = "img/ships/anaconda.png",           Description = "The legendary deep-space leviathan." },
            new() { Name = "Imperial Cutter",    CargoHold = 100, MaxSpeed = 190, ThrustPower = 70,  FuelEfficiency = 0.45f, TurnRate = 55,  MaxPaliva = 120, Price = 2000000, PathToTextures = "img/ships/imperial-cutter.png",   Description = "The pinnacle of luxury and cargo capacity." },
        };

        db.ShipTypes.AddRange(shipTypes);
        await db.SaveChangesAsync();
    }

    private static async Task SeedCargoTypesAsync(AppDbContext db)
    {
        if (await db.CargoTypes.AnyAsync()) return;

        var cargoTypes = new List<CargoTypeModel>
        {
            new() { Name = "Food",               Vaha = 1, BasePrice = 50 },
            new() { Name = "Minerals",            Vaha = 3, BasePrice = 80 },
            new() { Name = "Metals",              Vaha = 4, BasePrice = 120 },
            new() { Name = "Textiles",            Vaha = 1, BasePrice = 60 },
            new() { Name = "Machinery",           Vaha = 5, BasePrice = 200 },
            new() { Name = "Electronics",         Vaha = 2, BasePrice = 300 },
            new() { Name = "Medicine",            Vaha = 1, BasePrice = 250 },
            new() { Name = "Luxury Goods",        Vaha = 2, BasePrice = 500 },
            new() { Name = "Chemicals",           Vaha = 3, BasePrice = 150 },
            new() { Name = "Polymers",            Vaha = 2, BasePrice = 130 },
            new() { Name = "Rare Earth Elements", Vaha = 3, BasePrice = 400 },
            new() { Name = "Weapons",             Vaha = 4, BasePrice = 450 },
        };

        db.CargoTypes.AddRange(cargoTypes);
        await db.SaveChangesAsync();
    }
}
