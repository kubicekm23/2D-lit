using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace litWebApp.Models.DbModels;

public class PlanetModel
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = null!;

    public float CoordinateX { get; set; }
    public float CoordinateY { get; set; }

    public int CargoTypeId { get; set; }

    // Navigation
    [ForeignKey(nameof(CargoTypeId))]
    public CargoTypeModel CargoType { get; set; } = null!;

    public ICollection<PlanetAffectingStationModel> PlanetAffectingStations { get; set; } = new List<PlanetAffectingStationModel>();
}