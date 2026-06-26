var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.MapGet("/api/client-config", (IConfiguration configuration) =>
{
    return Results.Ok(new
    {
        dataPageUrl = configuration["ClientConfig:DataPageUrl"]
    });
});
app.MapFallbackToFile("index.html");

app.Run();
