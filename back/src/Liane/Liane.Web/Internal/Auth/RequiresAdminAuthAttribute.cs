using System;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Internal.Auth
{
    [AttributeUsage(AttributeTargets.Class, Inherited = false)]
    public class RequiresAdminAuthAttribute : TypeFilterAttribute
    {
        public RequiresAdminAuthAttribute() : base(typeof(RequiresAdminAuthAttributeFilter))
        {
            
        }
    }
}