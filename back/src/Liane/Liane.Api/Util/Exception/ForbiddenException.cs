namespace Liane.Api.Util.Exception;

public class ForbiddenException : System.Exception
{
    public ForbiddenException(string message = "Access forbidden") : base(message)
    {
    }
}