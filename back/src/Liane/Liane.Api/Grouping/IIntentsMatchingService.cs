using System.Collections.Generic;
using System.Threading.Tasks;

namespace Liane.Api.Grouping;

public interface IIntentsMatchingService
{
    public Task UpdateTripGroups();
    public Task<List<MatchedTripIntent>> GetMatchedGroups();
}