using System;
using Liane.Api.Routing;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Routing;
using Liane.Test.Mock;
using Liane.Web.Internal.Startup;
using Microsoft.Extensions.DependencyInjection;

namespace Liane.Test;

public class BaseTest
{
    protected readonly ServiceProvider ServiceProvider;

    public BaseTest()
    {
        var services = new ServiceCollection();
        
        var osrmClient = new OsrmClient(new OsrmSettings(new Uri("http://liane.gjini.co:5000")));
        services.AddService(RallyingPointServiceMock.CreateMockRallyingPointService());
        services.AddService<IOsrmService>(osrmClient);
        services.AddTransient<IRoutingService, RoutingServiceImpl>();

        ServiceProvider = services.BuildServiceProvider();
    }
}