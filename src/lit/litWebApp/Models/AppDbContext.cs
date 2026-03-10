using litWebApp.Models.DbModels;
using Microsoft.EntityFrameworkCore;

namespace litWebApp.Models;

public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<UserModel> Users => Set<UserModel>();
        public DbSet<ShipModel> Ships => Set<ShipModel>();
        public DbSet<ShipTypeModel> ShipTypes => Set<ShipTypeModel>();
        public DbSet<CargoModel> Cargos => Set<CargoModel>();
        public DbSet<CargoTypeModel> CargoTypes => Set<CargoTypeModel>();
        public DbSet<StationModel> Stations => Set<StationModel>();
        public DbSet<CargoTypeValueModel> CargoTypeValues => Set<CargoTypeValueModel>();
        public DbSet<HangarSpotModel> HangarSpots => Set<HangarSpotModel>();
        public DbSet<PlanetModel> Planets => Set<PlanetModel>();
        public DbSet<PlanetAffectingStationModel> PlanetAffectingStations => Set<PlanetAffectingStationModel>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ── Composite PKs ──────────────────────────────────

            modelBuilder.Entity<CargoTypeValueModel>()
                .HasKey(e => new { e.CargoTypeId, e.StationId });

            modelBuilder.Entity<HangarSpotModel>()
                .HasKey(e => new { e.StationId, e.ShipId });

            modelBuilder.Entity<PlanetAffectingStationModel>()
                .HasKey(e => new { e.PlanetId, e.StationId });

            // ── Relationships ──────────────────────────────────

            // UserModel → Ships  (one-to-many)
            modelBuilder.Entity<ShipModel>()
                .HasOne(s => s.User)
                .WithMany(u => u.Ships)
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // ShipType → Ships  (one-to-many)
            modelBuilder.Entity<ShipModel>()
                .HasOne(s => s.ShipType)
                .WithMany(st => st.Ships)
                .HasForeignKey(s => s.ShipTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            // Ship → Cargo  (one-to-many)
            modelBuilder.Entity<CargoModel>()
                .HasOne(c => c.Ship)
                .WithMany(s => s.Cargos)
                .HasForeignKey(c => c.ShipId)
                .OnDelete(DeleteBehavior.Cascade);

            // CargoType → Cargo  (one-to-many)
            modelBuilder.Entity<CargoModel>()
                .HasOne(c => c.CargoType)
                .WithMany(ct => ct.Cargos)
                .HasForeignKey(c => c.CargoTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            // Station → CargoTypeValue  (one-to-many)
            modelBuilder.Entity<CargoTypeValueModel>()
                .HasOne(ctv => ctv.Station)
                .WithMany(s => s.CargoTypeValues)
                .HasForeignKey(ctv => ctv.StationId)
                .OnDelete(DeleteBehavior.Cascade);

            // CargoType → CargoTypeValue  (one-to-many)
            modelBuilder.Entity<CargoTypeValueModel>()
                .HasOne(ctv => ctv.CargoType)
                .WithMany(ct => ct.CargoTypeValues)
                .HasForeignKey(ctv => ctv.CargoTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            // Station → HangarSpot  (one-to-many)
            modelBuilder.Entity<HangarSpotModel>()
                .HasOne(hs => hs.Station)
                .WithMany(s => s.HangarSpots)
                .HasForeignKey(hs => hs.StationId)
                .OnDelete(DeleteBehavior.Cascade);

            // Ship → HangarSpot  (one-to-zero-or-one)
            modelBuilder.Entity<HangarSpotModel>()
                .HasOne(hs => hs.Ship)
                .WithOne(s => s.HangarSpot)
                .HasForeignKey<HangarSpotModel>(hs => hs.ShipId)
                .OnDelete(DeleteBehavior.Cascade);

            // Planet → CargoType  (many-to-one)
            modelBuilder.Entity<PlanetModel>()
                .HasOne(p => p.CargoType)
                .WithMany(ct => ct.Planets)
                .HasForeignKey(p => p.CargoTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            // Planet → PlanetAffectingStation  (one-to-many)
            modelBuilder.Entity<PlanetAffectingStationModel>()
                .HasOne(pas => pas.Planet)
                .WithMany(p => p.PlanetAffectingStations)
                .HasForeignKey(pas => pas.PlanetId)
                .OnDelete(DeleteBehavior.Cascade);

            // Station → PlanetAffectingStation  (one-to-many)
            modelBuilder.Entity<PlanetAffectingStationModel>()
                .HasOne(pas => pas.Station)
                .WithMany(s => s.PlanetAffectingStations)
                .HasForeignKey(pas => pas.StationId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }