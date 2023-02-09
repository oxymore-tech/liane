using System;
using Microsoft.AspNetCore.Authorization;

namespace Liane.Web.Internal.Auth;

[AttributeUsage(AttributeTargets.Method)]
public sealed class DisableAuthAttribute : AllowAnonymousAttribute
{
}