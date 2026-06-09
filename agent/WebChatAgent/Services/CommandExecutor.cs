using System.Diagnostics;
using System.Text;
using WebChatAgent.Models;

namespace WebChatAgent.Services;

public interface ICommandExecutor
{
    Task<ExecuteResult> ExecuteAsync(ExecuteRequest request);
}

public class CommandExecutor : ICommandExecutor
{
    private readonly AgentSettings _settings;
    private readonly ILogger<CommandExecutor> _logger;

    public CommandExecutor(IOptions<AgentSettings> settings, ILogger<CommandExecutor> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<ExecuteResult> ExecuteAsync(ExecuteRequest request)
    {
        var result = new ExecuteResult { MessageId = request.MessageId };
        var sw = Stopwatch.StartNew();

        // Security: check blacklist
        foreach (var blocked in _settings.BlacklistedCommands)
        {
            if (request.Command.Contains(blocked, StringComparison.OrdinalIgnoreCase))
            {
                result.Success = false;
                result.Error = $"Command blocked by security policy: contains '{blocked}'";
                result.ExitCode = -1;
                _logger.LogWarning("Blocked command attempt: {Command}", request.Command);
                return result;
            }
        }

        // Resolve shell
        var (fileName, args) = ResolveShell(request.ShellType, request.Command);

        var psi = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = args,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        _logger.LogInformation("Executing [{Shell}]: {Command}", request.ShellType, request.Command);

        using var process = new Process { StartInfo = psi };
        var outputSb = new StringBuilder();
        var errorSb = new StringBuilder();

        process.OutputDataReceived += (_, e) =>
        {
            if (e.Data != null) outputSb.AppendLine(e.Data);
        };
        process.ErrorDataReceived += (_, e) =>
        {
            if (e.Data != null) errorSb.AppendLine(e.Data);
        };

        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        using var cts = new CancellationTokenSource(
            TimeSpan.FromSeconds(_settings.CommandTimeoutSeconds));

        try
        {
            await process.WaitForExitAsync(cts.Token);
        }
        catch (OperationCanceledException)
        {
            process.Kill(entireProcessTree: true);
            result.Success = false;
            result.Error = $"Command timed out after {_settings.CommandTimeoutSeconds}s";
            result.ExitCode = -1;
            return result;
        }

        sw.Stop();
        result.ExitCode = process.ExitCode;
        result.Success = process.ExitCode == 0;
        result.DurationMs = sw.Elapsed.TotalMilliseconds;

        // Truncate if too large
        var rawOutput = outputSb.ToString();
        result.Output = rawOutput.Length > _settings.MaxOutputBytes
            ? rawOutput[.._settings.MaxOutputBytes] + "\n[... output truncated ...]"
            : rawOutput;
        result.Error = errorSb.ToString();

        _logger.LogInformation(
            "Command completed in {Duration}ms, exit={Exit}",
            result.DurationMs, result.ExitCode);

        return result;
    }

    private static (string fileName, string args) ResolveShell(string shellType, string command)
    {
        return shellType.ToLower() switch
        {
            "powershell" => ("powershell.exe", $"-NonInteractive -Command \"{command.Replace("\"", "\\\"")}\""),
            "cmd"        => ("cmd.exe", $"/c {command}"),
            _            => ("/bin/bash", $"-c \"{command.Replace("\"", "\\\"")}\""),
        };
    }
}
