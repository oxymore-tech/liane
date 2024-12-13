using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using Liane.Api.Util.Http;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface IRallyingPointRequestService: ICrudEntityService<RallyingPointRequest>
{
  Task<PaginatedResponse<RallyingPointRequest>> ListForCurrentUser(Pagination pagination);
  Task<PaginatedResponse<RallyingPointRequest>> Paginate(Pagination pagination);
  Task<RallyingPointRequest> UpdateRequestStatus(Ref<RallyingPointRequest> request, RallyingPointRequestStatus status);
  Task<FeatureCollection> GetDepartment(string n);
}