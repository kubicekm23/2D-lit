namespace litWebApp.Models.DTOs;

public class WorldDto
{
    public List<StationDto> Stations { get; set; } = new();
    public float MinX { get; set; }
    public float MaxX { get; set; }
    public float MinY { get; set; }
    public float MaxY { get; set; }
}

public class StationDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public float X { get; set; }
    public float Y { get; set; }
    public int HangarLimit { get; set; }
}

public class PlayerDto
{
    public decimal Credits { get; set; }
    public ShipDto? ActiveShip { get; set; }
    public List<ShipSummaryDto> OwnedShips { get; set; } = new();
    public bool IsDocked { get; set; }
    public int? DockedStationId { get; set; }
}

public class ShipDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public ShipTypeDto Type { get; set; } = null!;
    public float Fuel { get; set; }
    public float X { get; set; }
    public float Y { get; set; }
    public float Rotation { get; set; }
    public float Vx { get; set; }
    public float Vy { get; set; }
    public List<CargoItemDto> Cargo { get; set; } = new();
}

public class ShipSummaryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string TypeName { get; set; } = "";
    public bool IsActive { get; set; }
}

public class ShipTypeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int CargoHold { get; set; }
    public float MaxSpeed { get; set; }
    public float ThrustPower { get; set; }
    public float FuelEfficiency { get; set; }
    public float TurnRate { get; set; }
    public int MaxFuel { get; set; }
    public decimal Price { get; set; }
    public string Description { get; set; } = "";
    public string Texture { get; set; } = "";
}

public class CargoItemDto
{
    public int CargoTypeId { get; set; }
    public string Name { get; set; } = "";
    public int Quantity { get; set; }
    public int Weight { get; set; }
}

public class StationDetailDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public List<StationCargoDto> Goods { get; set; } = new();
    public List<ShipTypeDto> ShipsForSale { get; set; } = new();
}

public class StationCargoDto
{
    public int CargoTypeId { get; set; }
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
}

public class SavePositionDto
{
    public float X { get; set; }
    public float Y { get; set; }
    public float Rotation { get; set; }
    public float Vx { get; set; }
    public float Vy { get; set; }
    public float Fuel { get; set; }
}

public class TradeDto
{
    public int CargoTypeId { get; set; }
    public int Quantity { get; set; }
}

public class BuyShipDto
{
    public int ShipTypeId { get; set; }
}

public class RespawnDto
{
    public int? ShipId { get; set; }
}

public class MapStationDto
{
    public int StationId { get; set; }
    public string Name { get; set; } = "";
    public float X { get; set; }
    public float Y { get; set; }
    public DateTime VisitedAt { get; set; }
    public List<StationCargoDto> CachedGoods { get; set; } = new();
}
