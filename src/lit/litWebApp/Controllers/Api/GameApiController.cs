using System.Security.Claims;
using System.Text.Json;
using litWebApp.Models;
using litWebApp.Models.DbModels;
using litWebApp.Models.DTOs;
using litWebApp.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace litWebApp.Controllers.Api;

[ApiController]
[Route("api/game")]
[Authorize]
public class GameApiController : ControllerBase
{
    private readonly AppDbContext _db;
    private const float StationInteractionRange = 800f;
    private const decimal FuelPricePerUnit = 5m;

    public GameApiController(AppDbContext db)
    {
        _db = db;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("world")]
    public async Task<ActionResult<WorldDto>> GetWorld()
    {
        var stations = await _db.Stations
            .Select(s => new StationDto
            {
                Id = s.Id,
                Name = s.Name,
                X = s.CoordinateX,
                Y = s.CoordinateY,
                HangarLimit = s.HangarLimit
            })
            .ToListAsync();

        var planets = await _db.Planets
            .Include(p => p.CargoType)
            .Select(p => new PlanetDto
            {
                Id = p.Id,
                Name = p.Name,
                X = p.CoordinateX,
                Y = p.CoordinateY,
                CargoName = p.CargoType.Name
            })
            .ToListAsync();

        return Ok(new WorldDto
        {
            Stations = stations,
            Planets = planets,
            MinX = WorldGenerationService.WorldMinX,
            MaxX = WorldGenerationService.WorldMaxX,
            MinY = WorldGenerationService.WorldMinY,
            MaxY = WorldGenerationService.WorldMaxY
        });
    }

    [HttpGet("player")]
    public async Task<ActionResult<PlayerDto>> GetPlayer()
    {
        var user = await _db.Users
            .Include(u => u.ActiveShip)
                .ThenInclude(s => s!.ShipType)
            .Include(u => u.ActiveShip)
                .ThenInclude(s => s!.Cargos)
                .ThenInclude(c => c.CargoType)
            .Include(u => u.ActiveShip)
                .ThenInclude(s => s!.HangarSpot)
            .Include(u => u.Ships)
                .ThenInclude(s => s.ShipType)
            .FirstOrDefaultAsync(u => u.Id == UserId);

        if (user == null) return NotFound();

        var activeShip = user.ActiveShip;

        var dto = new PlayerDto
        {
            Credits = user.Credits,
            IsDocked = activeShip?.HangarSpot != null,
            DockedStationId = activeShip?.HangarSpot?.StationId,
            OwnedShips = user.Ships.Select(s => new ShipSummaryDto
            {
                Id = s.Id,
                Name = s.Name,
                TypeName = s.ShipType.Name,
                IsActive = s.IsActive
            }).ToList()
        };

        if (activeShip != null)
        {
            dto.ActiveShip = new ShipDto
            {
                Id = activeShip.Id,
                Name = activeShip.Name,
                Fuel = activeShip.MnozstviPaliva,
                X = activeShip.PositionX,
                Y = activeShip.PositionY,
                Rotation = activeShip.Rotation,
                Vx = activeShip.VelocityX,
                Vy = activeShip.VelocityY,
                Hull = activeShip.Hull,
                Type = MapShipType(activeShip.ShipType),
                Cargo = activeShip.Cargos.Select(c => new CargoItemDto
                {
                    CargoTypeId = c.CargoTypeId,
                    Name = c.CargoType.Name,
                    Quantity = c.Quantity,
                    Weight = c.CargoType.Vaha
                }).ToList()
            };
        }

        return Ok(dto);
    }

    [HttpPost("save")]
    public async Task<IActionResult> SavePosition([FromBody] SavePositionDto dto)
    {
        var ship = await _db.Ships
            .Include(s => s.HangarSpot)
            .FirstOrDefaultAsync(s => s.UserId == UserId && s.IsActive);
        if (ship == null) return NotFound();

        // If docked, we don't allow changing position/velocity/fuel/hull via this API
        if (ship.HangarSpot == null)
        {
            ship.PositionX = dto.X;
            ship.PositionY = dto.Y;
            ship.Rotation = dto.Rotation;
            ship.VelocityX = dto.Vx;
            ship.VelocityY = dto.Vy;
            ship.MnozstviPaliva = dto.Fuel;
            ship.Hull = dto.Hull;
        }

        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("station/{id}")]
    public async Task<ActionResult<StationDetailDto>> GetStation(int id)
    {
        var ship = await _db.Ships.FirstOrDefaultAsync(s => s.UserId == UserId && s.IsActive);
        if (ship == null) return NotFound();

        var station = await _db.Stations
            .Include(s => s.CargoTypeValues).ThenInclude(ctv => ctv.CargoType)
            .Include(s => s.ShipStocks).ThenInclude(ss => ss.ShipType)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (station == null) return NotFound();

        // Check range
        var dist = MathF.Sqrt(
            MathF.Pow(ship.PositionX - station.CoordinateX, 2) +
            MathF.Pow(ship.PositionY - station.CoordinateY, 2));
        if (dist > StationInteractionRange)
            return BadRequest("Station out of range.");

        // Record visit and snapshot current data
        var visit = await _db.VisitedStations
            .FirstOrDefaultAsync(v => v.UserId == UserId && v.StationId == id);

        var currentGoods = station.CargoTypeValues.Select(ctv => new StationCargoDto
        {
            CargoTypeId = ctv.CargoTypeId,
            Name = ctv.CargoType.Name,
            Price = ctv.Value
        }).ToList();

        var currentShips = station.ShipStocks.Select(ss => MapShipType(ss.ShipType)).ToList();

        if (visit == null)
        {
            visit = new VisitedStationModel
            {
                UserId = UserId,
                StationId = id,
                VisitedAt = DateTime.UtcNow,
                CachedGoodsJson = JsonSerializer.Serialize(currentGoods),
                CachedShipsJson = JsonSerializer.Serialize(currentShips)
            };
            _db.VisitedStations.Add(visit);
        }
        else
        {
            visit.VisitedAt = DateTime.UtcNow;
            visit.CachedGoodsJson = JsonSerializer.Serialize(currentGoods);
            visit.CachedShipsJson = JsonSerializer.Serialize(currentShips);
        }
        await _db.SaveChangesAsync();

        return Ok(new StationDetailDto
        {
            Id = station.Id,
            Name = station.Name,
            Goods = currentGoods,
            ShipsForSale = currentShips
        });
    }

    [HttpPost("station/{id}/buy")]
    public async Task<IActionResult> BuyCargo(int id, [FromBody] TradeDto dto)
    {
        var user = await _db.Users.FindAsync(UserId);
        if (user == null) return NotFound();

        var ship = await _db.Ships
            .Include(s => s.ShipType)
            .Include(s => s.Cargos).ThenInclude(c => c.CargoType)
            .Include(s => s.HangarSpot)
            .FirstOrDefaultAsync(s => s.UserId == UserId && s.IsActive);
        if (ship == null) return NotFound();

        // Must be docked
        if (ship.HangarSpot?.StationId != id)
            return BadRequest("Not docked at this station.");

        var price = await _db.CargoTypeValues
            .FirstOrDefaultAsync(ctv => ctv.StationId == id && ctv.CargoTypeId == dto.CargoTypeId);
        if (price == null) return BadRequest("Cargo not available at this station.");

        var cargoType = await _db.CargoTypes.FindAsync(dto.CargoTypeId);
        if (cargoType == null) return NotFound();

        var totalCost = price.Value * dto.Quantity;
        if (user.Credits < totalCost)
            return BadRequest("Insufficient credits.");

        // Check cargo space
        var currentWeight = ship.Cargos.Sum(c => c.Quantity * c.CargoType.Vaha);
        var additionalWeight = dto.Quantity * cargoType.Vaha;
        if (currentWeight + additionalWeight > ship.ShipType.CargoHold)
            return BadRequest("Insufficient cargo space.");

        user.Credits -= totalCost;

        // Add or update cargo on ship
        var existing = ship.Cargos.FirstOrDefault(c => c.CargoTypeId == dto.CargoTypeId);
        if (existing != null)
        {
            existing.Quantity += dto.Quantity;
        }
        else
        {
            _db.Cargos.Add(new CargoModel
            {
                ShipId = ship.Id,
                CargoTypeId = dto.CargoTypeId,
                Quantity = dto.Quantity
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { credits = user.Credits });
    }

    [HttpPost("station/{id}/sell")]
    public async Task<IActionResult> SellCargo(int id, [FromBody] TradeDto dto)
    {
        var user = await _db.Users.FindAsync(UserId);
        if (user == null) return NotFound();

        var ship = await _db.Ships
            .Include(s => s.Cargos)
            .Include(s => s.HangarSpot)
            .FirstOrDefaultAsync(s => s.UserId == UserId && s.IsActive);
        if (ship == null) return NotFound();

        if (ship.HangarSpot?.StationId != id)
            return BadRequest("Not docked at this station.");

        var cargo = ship.Cargos.FirstOrDefault(c => c.CargoTypeId == dto.CargoTypeId);
        if (cargo == null || cargo.Quantity < dto.Quantity)
            return BadRequest("Not enough cargo to sell.");

        var price = await _db.CargoTypeValues
            .FirstOrDefaultAsync(ctv => ctv.StationId == id && ctv.CargoTypeId == dto.CargoTypeId);
        if (price == null) return BadRequest("Station does not trade this cargo.");

        user.Credits += price.Value * dto.Quantity;
        cargo.Quantity -= dto.Quantity;

        if (cargo.Quantity == 0)
            _db.Cargos.Remove(cargo);

        await _db.SaveChangesAsync();
        return Ok(new { credits = user.Credits });
    }

    [HttpPost("station/{id}/refuel")]
    public async Task<IActionResult> Refuel(int id)
    {
        var user = await _db.Users.FindAsync(UserId);
        if (user == null) return NotFound();

        var ship = await _db.Ships
            .Include(s => s.ShipType)
            .Include(s => s.HangarSpot)
            .FirstOrDefaultAsync(s => s.UserId == UserId && s.IsActive);
        if (ship == null) return NotFound();

        if (ship.HangarSpot?.StationId != id)
            return BadRequest("Not docked at this station.");

        var fuelNeeded = ship.ShipType.MaxPaliva - ship.MnozstviPaliva;
        if (fuelNeeded <= 0) return Ok(new { credits = user.Credits, fuel = ship.MnozstviPaliva });

        var cost = (decimal)fuelNeeded * (decimal)FuelPricePerUnit;
        if (user.Credits < cost)
            return BadRequest("Insufficient credits.");

        user.Credits -= cost;
        ship.MnozstviPaliva = ship.ShipType.MaxPaliva;

        await _db.SaveChangesAsync();
        return Ok(new { credits = user.Credits, fuel = ship.MnozstviPaliva });
    }

    [HttpPost("station/{id}/buyship")]
    public async Task<IActionResult> BuyShip(int id, [FromBody] BuyShipDto dto)
    {
        var user = await _db.Users.FindAsync(UserId);
        if (user == null) return NotFound();

        var currentShip = await _db.Ships
            .Include(s => s.HangarSpot)
            .FirstOrDefaultAsync(s => s.UserId == UserId && s.IsActive);
        if (currentShip == null) return NotFound();

        if (currentShip.HangarSpot?.StationId != id)
            return BadRequest("Not docked at this station.");

        var stock = await _db.StationShipStocks
            .FirstOrDefaultAsync(ss => ss.StationId == id && ss.ShipTypeId == dto.ShipTypeId);
        if (stock == null || stock.StockCount <= 0)
            return BadRequest("Ship not in stock.");

        var shipType = await _db.ShipTypes.FindAsync(dto.ShipTypeId);
        if (shipType == null) return NotFound();

        if (user.Credits < shipType.Price)
            return BadRequest("Insufficient credits.");

        user.Credits -= shipType.Price;
        stock.StockCount--;

        // Deactivate current ship
        currentShip.IsActive = false;

        // Create new ship
        var newShip = new ShipModel
        {
            Name = $"{user.Username}'s {shipType.Name}",
            UserId = user.Id,
            ShipTypeId = shipType.Id,
            MnozstviPaliva = shipType.MaxPaliva,
            PositionX = currentShip.PositionX,
            PositionY = currentShip.PositionY,
            IsActive = true
        };
        _db.Ships.Add(newShip);
        await _db.SaveChangesAsync();

        // Dock new ship at station, undock old one
        var oldSpot = currentShip.HangarSpot;
        if (oldSpot != null) _db.HangarSpots.Remove(oldSpot);

        _db.HangarSpots.Add(new HangarSpotModel
        {
            StationId = id,
            ShipId = newShip.Id
        });

        user.ActiveShipId = newShip.Id;
        await _db.SaveChangesAsync();

        return Ok(new { credits = user.Credits });
    }

    [HttpPost("station/{id}/dock")]
    public async Task<IActionResult> Dock(int id, [FromBody] SavePositionDto dto)
    {
        var ship = await _db.Ships
            .Include(s => s.HangarSpot)
            .FirstOrDefaultAsync(s => s.UserId == UserId && s.IsActive);
        if (ship == null) return NotFound();

        if (ship.HangarSpot != null)
            return BadRequest("Already docked.");

        var station = await _db.Stations.FindAsync(id);
        if (station == null) return NotFound();

        var dist = MathF.Sqrt(
            MathF.Pow(ship.PositionX - station.CoordinateX, 2) +
            MathF.Pow(ship.PositionY - station.CoordinateY, 2));
        if (dist > StationInteractionRange)
            return BadRequest("Station out of range.");

        var occupiedSpots = await _db.HangarSpots.CountAsync(h => h.StationId == id);
        if (occupiedSpots >= station.HangarLimit)
            return BadRequest("No hangar spots available.");

        // Dock
        _db.HangarSpots.Add(new HangarSpotModel
        {
            StationId = id,
            ShipId = ship.Id
        });

        ship.PositionX = station.CoordinateX;
        ship.PositionY = station.CoordinateY;
        ship.VelocityX = 0;
        ship.VelocityY = 0;
        ship.MnozstviPaliva = dto.Fuel;
        ship.Hull = dto.Hull;

        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("station/{id}/undock")]
    public async Task<IActionResult> Undock(int id)
    {
        var ship = await _db.Ships
            .Include(s => s.HangarSpot)
            .FirstOrDefaultAsync(s => s.UserId == UserId && s.IsActive);
        if (ship == null) return NotFound();

        if (ship.HangarSpot?.StationId != id)
            return BadRequest("Not docked at this station.");

        _db.HangarSpots.Remove(ship.HangarSpot);
        await _db.SaveChangesAsync();
        return Ok();
    }

    private const decimal RepairPricePerPoint = 2m;

    [HttpPost("station/{id}/repair")]
    public async Task<IActionResult> Repair(int id)
    {
        var user = await _db.Users.FindAsync(UserId);
        if (user == null) return NotFound();

        var ship = await _db.Ships
            .Include(s => s.ShipType)
            .Include(s => s.HangarSpot)
            .FirstOrDefaultAsync(s => s.UserId == UserId && s.IsActive);
        if (ship == null) return NotFound();

        if (ship.HangarSpot?.StationId != id)
            return BadRequest("Not docked at this station.");

        var damagePoints = 100f - ship.Hull;
        if (damagePoints <= 0) return Ok(new { credits = user.Credits, hull = ship.Hull });

        var cost = (decimal)damagePoints * RepairPricePerPoint;
        if (user.Credits < cost)
            return BadRequest("Insufficient credits.");

        user.Credits -= cost;
        ship.Hull = 100f;

        await _db.SaveChangesAsync();
        return Ok(new { credits = user.Credits, hull = ship.Hull });
    }

    [HttpPost("respawn")]
    public async Task<IActionResult> Respawn([FromBody] RespawnDto dto)
    {
        var user = await _db.Users
            .Include(u => u.Ships).ThenInclude(s => s.ShipType)
            .Include(u => u.Ships).ThenInclude(s => s.HangarSpot)
            .FirstOrDefaultAsync(u => u.Id == UserId);
        if (user == null) return NotFound();

        // Find nearest station for respawn location
        var stations = await _db.Stations.ToListAsync();
        if (stations.Count == 0) return BadRequest("No stations exist.");

        var currentShip = user.Ships.FirstOrDefault(s => s.IsActive);

        ShipModel targetShip;
        if (dto.ShipId.HasValue)
        {
            // Switch to an owned ship
            targetShip = user.Ships.FirstOrDefault(s => s.Id == dto.ShipId.Value);
            if (targetShip == null) return BadRequest("Ship not found.");
        }
        else
        {
            // No ship specified - use current ship (just respawn it)
            if (currentShip == null) return BadRequest("No active ship.");
            targetShip = currentShip;
        }

        // Find nearest station to current ship position
        float shipX = currentShip?.PositionX ?? 0;
        float shipY = currentShip?.PositionY ?? 0;
        var nearestStation = stations.OrderBy(s =>
            MathF.Pow(s.CoordinateX - shipX, 2) + MathF.Pow(s.CoordinateY - shipY, 2)
        ).First();

        // Deactivate all ships
        foreach (var s in user.Ships) s.IsActive = false;

        // Remove any hangar spot from target ship
        if (targetShip.HangarSpot != null)
            _db.HangarSpots.Remove(targetShip.HangarSpot);

        // Activate and teleport target ship to nearest station
        targetShip.IsActive = true;
        targetShip.PositionX = nearestStation.CoordinateX;
        targetShip.PositionY = nearestStation.CoordinateY;
        targetShip.VelocityX = 0;
        targetShip.VelocityY = 0;
        targetShip.MnozstviPaliva = targetShip.ShipType.MaxPaliva * 0.4f; // 40% fuel
        targetShip.Hull = 100f; // Fully repaired upon recovery
        user.ActiveShipId = targetShip.Id;

        // Dock at the station
        var occupiedSpots = await _db.HangarSpots.CountAsync(h => h.StationId == nearestStation.Id);
        if (occupiedSpots < nearestStation.HangarLimit)
        {
            _db.HangarSpots.Add(new HangarSpotModel
            {
                StationId = nearestStation.Id,
                ShipId = targetShip.Id
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { credits = user.Credits, stationId = nearestStation.Id });
    }

    [HttpGet("map")]
    public async Task<ActionResult<List<MapStationDto>>> GetMap()
    {
        var visits = await _db.VisitedStations
            .Where(v => v.UserId == UserId)
            .Include(v => v.Station)
            .ToListAsync();

        var result = visits.Select(v => new MapStationDto
        {
            StationId = v.StationId,
            Name = v.Station.Name,
            X = v.Station.CoordinateX,
            Y = v.Station.CoordinateY,
            VisitedAt = v.VisitedAt,
            CachedGoods = string.IsNullOrEmpty(v.CachedGoodsJson)
                ? new List<StationCargoDto>()
                : JsonSerializer.Deserialize<List<StationCargoDto>>(v.CachedGoodsJson) ?? new(),
            CachedShips = string.IsNullOrEmpty(v.CachedShipsJson)
                ? new List<ShipTypeDto>()
                : JsonSerializer.Deserialize<List<ShipTypeDto>>(v.CachedShipsJson) ?? new()
        }).ToList();

        return Ok(result);
    }

    private static ShipTypeDto MapShipType(ShipTypeModel st) => new()
    {
        Id = st.Id,
        Name = st.Name,
        CargoHold = st.CargoHold,
        MaxSpeed = st.MaxSpeed,
        ThrustPower = st.ThrustPower,
        FuelEfficiency = st.FuelEfficiency,
        TurnRate = st.TurnRate,
        MaxFuel = st.MaxPaliva,
        Price = st.Price,
        Description = st.Description,
        Texture = st.PathToTextures
    };
}
