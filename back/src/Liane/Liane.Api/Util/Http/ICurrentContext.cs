using Liane.Api.User;

namespace Liane.Api.Util.Http;

public interface ICurrentContext
{
    AuthUser CurrentUser();
}