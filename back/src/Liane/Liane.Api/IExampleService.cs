using System.Threading.Tasks;

namespace Liane.Api
{
    public interface IExampleService
    {
        Task<Route> ExampleMethod();
    }
}