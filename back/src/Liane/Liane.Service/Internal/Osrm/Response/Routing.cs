using System.Collections.Immutable;

namespace Liane.Service.Internal.Osrm.Response;
/**
 * {
   "code":"Ok",
   "routes":[
      {
         "legs":[
            {
               "steps":[
                  
               ],
               "summary":"",
               "weight":262.4,
               "duration":259.6,
               "distance":1884
            },
            {
               "steps":[
                  
               ],
               "summary":"",
               "weight":370.4,
               "duration":370.4,
               "distance":2839.2
            }
         ],
         "weight_name":"routability",
         "weight":632.8,
         "duration":630,
         "distance":4723.2
      }
   ],
   "waypoints":[
      {
         "hint":"Gf8JgM50mYUXAAAABQAAAAAAAAAgAAAAfXRPQdLNK0AAAAAAsPePQQsAAAADAAAAAAAAABAAAAAJ9AAA_kvMAKlYIQM8TMwArVghAwAA7wpXg-vq",
         "distance":4.231666,
         "name":"Friedrichstraße",
         "location":[
            13.388798,
            52.517033
         ]
      },
      {
         "hint":"AwLdgbLYiIcGAAAACgAAAAAAAAB3AAAA5JSNQJ0fwkAAAAAAGjmEQgYAAAAKAAAAAAAAAHcAAAAJ9AAAfm7MABiJIQOCbswA_4ghAwAAXwVXg-vq",
         "distance":2.795167,
         "name":"Torstraße",
         "location":[
            13.39763,
            52.529432
         ]
      },
      {
         "hint":"6SkYgP___38fAAAAUQAAACYAAAAeAAAAsowKQkpQX0Li6yZCvsQGQh8AAABRAAAAJgAAAB4AAAAJ9AAASufMAOdwIQNL58wA03AhAwQAvxBXg-vq",
         "distance":2.226595,
         "name":"Platz der Vereinten Nationen",
         "location":[
            13.428554,
            52.523239
         ]
      }
   ]
}
 */
public sealed record Routing(string Code, ImmutableList<Waypoint> Waypoints, ImmutableList<Route> Routes);