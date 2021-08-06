using System;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Internal.Auth
{
    [AttributeUsage(AttributeTargets.Method)]
    public class RequiresAdminAuthAttribute : TypeFilterAttribute
    {
        public RequiresAdminAuthAttribute() : base(typeof(RequiresAdminAuthAttributeFilter))
        {
            
        }
    }
}