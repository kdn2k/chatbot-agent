using Microsoft.AspNetCore.Mvc;
using WebChatAgent.Models;
using WebChatAgent.Services;

namespace WebChatAgent.Controllers;

[ApiController]
[Route("api")]
public class AgentController : ControllerBase
{
    private readonly ICommandExecutor _executor;
    private readonly AgentSettings _settings;
    private readonly ILogger<AgentController> _logger;

    public AgentController(
        ICommandExecutor executor,
        IOptions<AgentSettings> settings,
        ILogger<AgentController> logger)
    {
        _executor = executor;
        _settings = settings.Value;
        _logger = logger;
    }

    // ── API key middleware check ──────────────────────────────────────────────
    private bool IsAuthorized()
    {
        if (!Request.Headers.TryGetValue("X-Api-Key", out var key))
            return false;
        return key == _settings.ApiKey;
    }

    // ── Health check ─────────────────────────────────────────────────────────
    [HttpGet("health")]
    public IActionResult Health()
    {
        if (!IsAuthorized()) return Unauthorized(new { message = "Invalid API key" });
        return Ok(new
        {
            status = "healthy",
            hostname = Environment.MachineName,
            os = Environment.OSVersion.ToString(),
            time = DateTime.UtcNow,
        });
    }

    // ── Execute command ───────────────────────────────────────────────────────
    [HttpPost("execute")]
    public async Task<IActionResult> Execute([FromBody] ExecuteRequest request)
    {
        if (!IsAuthorized())
        {
            _logger.LogWarning("Unauthorized execute attempt from {IP}", HttpContext.Connection.RemoteIpAddress);
            return Unauthorized(new { message = "Invalid API key" });
        }

        if (string.IsNullOrWhiteSpace(request.Command))
            return BadRequest(new { message = "Command is required" });

        if (!_settings.AllowedShells.Contains(request.ShellType, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { message = $"Shell '{request.ShellType}' is not allowed" });

        var result = await _executor.ExecuteAsync(request);
        return Ok(result);
    }
}
