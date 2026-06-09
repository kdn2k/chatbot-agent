namespace WebChatAgent.Models;

public class ExecuteRequest
{
    public string MessageId { get; set; } = string.Empty;
    public string Command { get; set; } = string.Empty;
    public string ShellType { get; set; } = "bash";
}

public class ExecuteResult
{
    public string MessageId { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string Output { get; set; } = string.Empty;
    public string Error { get; set; } = string.Empty;
    public int ExitCode { get; set; }
    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
    public double DurationMs { get; set; }
}

public class AgentSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public List<string> AllowedShells { get; set; } = new();
    public int CommandTimeoutSeconds { get; set; } = 60;
    public int MaxOutputBytes { get; set; } = 65536;
    public List<string> BlacklistedCommands { get; set; } = new();
}
