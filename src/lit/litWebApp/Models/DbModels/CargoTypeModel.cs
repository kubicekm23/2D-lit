using System.ComponentModel.DataAnnotations;

namespace litWebApp.Models.DbModels;

public class CargoTypeModel
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = null!;

    public int Vaha { get; set; }

    // Navigation
    public ICollection<CargoModel> Cargos { get; set; } = new List<CargoModel>();
    public ICollection<CargoTypeValueModel> CargoTypeValues { get; set; } = new List<CargoTypeValueModel>();
    public ICollection<PlanetModel> Planets { get; set; } = new List<PlanetModel>();
}