using System.Threading.Tasks;

namespace Liane.Service.Internal.Nominatim
{
    public interface INominatimService
    {
        Task<Response> Search();
    }
}