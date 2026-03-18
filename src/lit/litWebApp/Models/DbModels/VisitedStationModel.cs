using System.ComponentModel.DataAnnotations.Schema;

namespace litWebApp.Models.DbModels;

/// <summary>Composite PK: (UserId, StationId)</summary>
public class VisitedStationModel
{
    public int UserId { get; set; }
    public int StationId { get; set; }

    public DateTime VisitedAt { get; set; }

    /// <summary>JSON array of { CargoTypeId, Name, Price }</summary>
    public string? CachedGoodsJson { get; set; }

    /// <summary>JSON array of { Id, Name, Price, Description, ... }</summary>
    public string? CachedShipsJson { get; set; }

    // Navigation
    [ForeignKey(nameof(UserId))]
    public UserModel User { get; set; } = null!;

    [ForeignKey(nameof(StationId))]
    public StationModel Station { get; set; } = null!;
}
