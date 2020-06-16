namespace Liane.Api.Util.Exception

{
    public class ExpectationFailedException : System.Exception
    {
        public ExpectationFailedException(string message) : base(message)
        {
        }
    }
}