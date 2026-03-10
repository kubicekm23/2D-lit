using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace litWebApp.Models.DbModels;

public class UserModel
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string Username { get; set; } = null!;

    [Required]
    [MaxLength(255)]
    public string Password { get; set; } = null!;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Credits { get; set; }

    // Navigation
    public ICollection<ShipModel> Ships { get; set; } = new List<ShipModel>();
}