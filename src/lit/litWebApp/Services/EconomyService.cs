using litWebApp.Models;
using Microsoft.EntityFrameworkCore;

namespace litWebApp.Services;

public class EconomyService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<EconomyService> _logger;
    private readonly TimeSpan _tickInterval = TimeSpan.FromSeconds(60);

    public EconomyService(IServiceProvider services, ILogger<EconomyService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Economy Service is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await FluctuatePricesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fluctuating prices.");
            }

            await Task.Delay(_tickInterval, stoppingToken);
        }
    }

    private async Task FluctuatePricesAsync()
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // We fluctuate each price by +/- 2%
        // Using raw SQL for speed since there can be many entries (Stations * CargoTypes)
        // PostgreSQL: RANDOM() returns 0..1, so (RANDOM() * 0.04 - 0.02) is -0.02..0.02
        await db.Database.ExecuteSqlRawAsync(
            "UPDATE \"CargoTypeValues\" SET \"Value\" = ROUND(\"Value\" * (1.0 + (RANDOM() * 0.04 - 0.02))::numeric, 2)");

        _logger.LogInformation("Economy tick: Prices fluctuated.");
    }
}
