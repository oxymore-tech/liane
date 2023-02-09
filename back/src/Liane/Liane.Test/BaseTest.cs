using System;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Startup;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Routing;
using Liane.Service.Internal.Trip;
using Liane.Test.Mock;
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