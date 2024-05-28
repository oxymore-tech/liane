using System;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Util;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;

namespace Liane.Web.Internal.AccessLevel;

public sealed class RequiresAccessLevelFilter(
  IServiceProvider serviceProvider,
  ICurrentContext currentContext,
  IAccessLevelContextFactory accessorProvider,
  ResourceAccessLevel accessLevel,
  Type resourceType,
  string resourceIdentifier)
  : IAsyncAuthorizationFilter
{
  public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
  {
    try
    {
      // Get Resolver service for given public resource type 
      var resolver = serviceProvider.GetService(typeof(IResourceResolverService<>).MakeGenericType(resourceType))!;
      if (resolver is null)
      {
        throw new ForbiddenException($"Unable to find service IResourceResolverService<{resourceType}>");
      }
      // Get corresponding internal resource type 

      var internalResolverInterface = resolver.GetType().GetInterfaces().FirstOrDefault(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IInternalResourceResolverService<,>));
      if (internalResolverInterface == null) throw new ConstraintException();
      // Get type TDb
      var internalResourceType = internalResolverInterface.GetGenericArguments()[0];

      // Get access level context factory and generate context object for given access level and user
      var method = accessorProvider.GetType().GetMethod(nameof(IAccessLevelContextFactory.NewAccessLevelContext))!.MakeGenericMethod(internalResourceType);

      var accessLevelContext = method.Invoke(accessorProvider, [
        accessLevel, currentContext.CurrentUser()
      ])!;

      // Get resource id in current route 
      var resourceId = context.HttpContext.GetRouteData().Values[resourceIdentifier]?.ToString();

      if (resourceId != null)
      {
        // Check requested resource can be accessed by user 
        var filter = accessLevelContext.GetType().GetProperty("HasAccessLevelPredicate")?.GetValue(accessLevelContext);

        // Check type is correct
        if (filter == null)
        {
          throw new ConstraintException();
        }

        // Check if access level requirements are fulfilled   
        var getIfMatchesMethod = internalResolverInterface.GetMethod("GetIfMatches")!;
        dynamic task = getIfMatchesMethod.Invoke(resolver, [resourceId, filter])!;

        var result = await task;
        context.HttpContext.Items[CurrentContextImpl.CurrentResourceName] = result;

        if (result == null) throw new ForbiddenException();
      }

      // Set context to current access level 
      context.HttpContext.Items[CurrentContextImpl.CurrentResourceAccessLevelName] = accessLevel;
    }
    catch (System.Exception e)
    {
      var logger = (ILogger?)serviceProvider.GetService(typeof(ILogger<RequiresAccessLevelFilter>))!;
      context.Result = HttpExceptionMapping.Map(e, context.ModelState, logger);
    }
  }
}