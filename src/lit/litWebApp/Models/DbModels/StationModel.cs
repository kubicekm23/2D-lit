using System.ComponentModel.DataAnnotations;

namespace litWebApp.Models.DbModels;

public class StationModel
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = null!;

    public float CoordinateX { get; set; }
    public float CoordinateY { get; set; }
    public int HangarLimit { get; set; }

    // Navigation
    public ICollection<CargoTypeValueModel> CargoTypeValues { get; set; } = new List<CargoTypeValueModel>();
    public ICollection<HangarSpotModel> HangarSpots { get; set; } = new List<HangarSpotModel>();
    public ICollection<PlanetAffectingStationModel> PlanetAffectingStations { get; set; } = new List<PlanetAffectingStationModel>();
    public ICollection<StationShipStockModel> ShipStocks { get; set; } = new List<StationShipStockModel>();
    public ICollection<VisitedStationModel> VisitedByUsers { get; set; } = new List<VisitedStationModel>();
}