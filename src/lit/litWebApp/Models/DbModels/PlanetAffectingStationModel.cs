using System.ComponentModel.DataAnnotations.Schema;

namespace litWebApp.Models.DbModels;


/// <summary>Composite PK: (PlanetId, StationId)</summary>
public class PlanetAffectingStationModel
{
    public int PlanetId { get; set; }
    public int StationId { get; set; }

    // Navigation
    [ForeignKey(nameof(PlanetId))]
    public PlanetModel Planet { get; set; } = null!;

    [ForeignKey(nameof(StationId))]
    public StationModel Station { get; set; } = null!;
}