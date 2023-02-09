import { Liane, LianeRequest, PaginatedResponse } from "@/api";
import { LianeService } from "@/api/service/liane";

export class LianeServiceMock implements LianeService {
  readonly mockLianes: Liane[] = [
    {
      departureTime: "2023-01-05T10:05:00Z",
      wayPoints: [
        {
          rallyingPoint: {
            label: "Toulouse",
            location: {
              lat: 1.35,
              lng: 43.6
            }
          },
          duration: 0
        },

        {
          rallyingPoint: {
            label: "Muret",
            location: {
              lat: 1.28,
              lng: 43.44
            }
          },
          duration: 1860
        },
        {
          rallyingPoint: {
            label: "Luchon",
            location: {
              lat: 0.54,
              lng: 42.75
            }
          },
          duration: 6000
        }
      ],
      members: []
    }
  ];

  list = async (): Promise<PaginatedResponse<Liane>> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { data: this.mockLianes, hasNext: false, pageSize: this.mockLianes.length };
  };

  post = async (liane: LianeRequest): Promise<Liane> => {
    console.log("FAKE POST", liane);
    return this.mockLianes[0];
  };
}
