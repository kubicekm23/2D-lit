using System.ComponentModel.DataAnnotations.Schema;

namespace litWebApp.Models.DbModels;

/// <summary>Composite PK: (StationId, ShipTypeId)</summary>
public class StationShipStockModel
{
    public int StationId { get; set; }
    public int ShipTypeId { get; set; }

    public int StockCount { get; set; }

    // Navigation
    [ForeignKey(nameof(StationId))]
    public StationModel Station { get; set; } = null!;

    [ForeignKey(nameof(ShipTypeId))]
    public ShipTypeModel ShipType { get; set; } = null!;
}
