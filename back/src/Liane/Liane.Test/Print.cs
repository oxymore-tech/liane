
using System.Collections.Generic;
using System.Collections.Immutable;
using Liane.Api.Trip;

namespace Liane.Test
{
        // I will handle null elements later.
       public static class Print {

        public static string ImmutableListToString<T>(ImmutableList<T> list){
            var listString = "[";
            foreach(var element in list) {
                
                listString += element!.ToString() + ", ";
            }
            return listString.Remove(listString.Length - 2, 2) + "]\n";
        }

        public static string DictToString<T>(Dictionary<string, ImmutableList<T>> dict){
            var dictString = "Dict : ";
            foreach(var entry in dict) { // KeyValuePair<string, ImmutableList<T>> entry
                dictString += "{" + entry.Key + ", " + ImmutableListToString(entry.Value) + "}; \n";
            }
            return dictString.Remove(dictString.Length - 5, 5) + ".";
        }

        public static string TripToString(Trip trip){
            return ImmutableListToString(trip.Coordinates);
        }

        public static string ImmutableHashSetToString(ImmutableHashSet<Liane.Api.Trip.Trip> hashSet) {
            var hashSettring = "[";
            foreach(var trip in hashSet) { // KeyValuePair<string, ImmutableList<T>> entry
                hashSettring += TripToString(trip) + ", \n";
            }
            return hashSettring.Remove(hashSettring.Length - 4, 4) + "]";
        }

    }

}