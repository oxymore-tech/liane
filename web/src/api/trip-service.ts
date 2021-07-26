import {
  LianeStats,
  RawTrip, RawTripFilterOptions, RawTripStats, RoutedLiane, TripFilterOptions
} from "@/api/index";
import { get, post, postAs } from "@/api/http";

/**
 * Class that manages the lianes and raw trips requests.
 */
export class TripService {

  /**
   * Get the lianes according to the filter.
   */
  static async snapLianes(filter: TripFilterOptions): Promise<RoutedLiane[]> {
    return postAs("/api/liane/snap", { body: filter });
  }

  /**
   * Re-generate the lianes.
   */
  static async generateLianes() {
    return post("/api/liane/generate");
  }

  /**
   * Get raw trips statistics.
   */
  static async statsLiane(): Promise<LianeStats> {
    return get("api/liane/stats");
  }

  /**
   * Get all raw trips.
   */
  static async getRaw(): Promise<RawTrip[]> {
    return get("/api/raw/all");
  }

  /**
   * Get raw trips according ot the filter.
   */
  static async snapRaw(filter: RawTripFilterOptions): Promise<RawTrip[]> {
    return postAs("/api/raw/snap", { body: filter });
  }

  /**
   * Get raw trips statistics.
   */
  static async statsRaw(): Promise<RawTripStats> {
    return get("api/raw/stats");
  }

}
