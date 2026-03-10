using System.ComponentModel.DataAnnotations.Schema;

namespace litWebApp.Models.DbModels;

/// <summary>Composite PK: (StationId, ShipId)</summary>
public class HangarSpotModel
{
    public int StationId { get; set; }
    public int ShipId { get; set; }

    // Navigation
    [ForeignKey(nameof(StationId))]
    public StationModel Station { get; set; } = null!;

    [ForeignKey(nameof(ShipId))]
    public ShipModel Ship { get; set; } = null!;
}