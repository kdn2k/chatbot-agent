using Serilog;
using WebChatAgent.Models;
using WebChatAgent.Services;

var builder = WebApplication.CreateBuilder(args);

// Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .CreateLogger();
builder.Host.UseSerilog();

builder.Services.AddControllers();
builder.Services.Configure<AgentSettings>(
    builder.Configuration.GetSection("AgentSettings"));
builder.Services.AddSingleton<ICommandExecutor, CommandExecutor>();

var app = builder.Build();

app.UseSerilogRequestLogging();
app.MapControllers();

Log.Information("WebChat Agent starting on {Urls}", builder.Configuration["Urls"]);
app.Run();
