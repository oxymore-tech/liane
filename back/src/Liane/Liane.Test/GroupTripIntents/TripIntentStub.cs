using System;
using System.Collections.Generic;
using Liane.Api.RallyingPoint;
using Liane.Api.Routing;
using Liane.Api.TripIntent;

namespace Liane.Test.GroupTripIntents;

public static class TripIntentStub
{
    public static List<TripIntent> GetTripIntents()
    {
        // Rallying Points
        var aurillac = new RallyingPoint(
            "rp1","Aurillac", 
            new LatLng(44.9285441, 2.4433101), true);

        var saintpaul = new RallyingPoint(
            "rp2","Saint-Paul-des-Landes", 
            new LatLng(44.9439943, 2.3125999), true);

        var ytrac = new RallyingPoint(
            "rp3","Ytrac", 
            new LatLng(44.9111838, 2.3633014), true);
   
        var vic = new RallyingPoint(
            "rp4","Vic-sur-Cère", 
            new LatLng(44.9802528, 2.6244222), true);
        
        var arpajon = new RallyingPoint(
            "rp5","Arpajon-sur-Cère", 
            new LatLng(44.9034428, 2.4570176), true);
        
        var naucelles = new RallyingPoint(
            "rp6","Naucelles", 
            new LatLng(44.9556611, 2.4175947), true);
        
        var laroquebrou = new RallyingPoint(
            "rp7","Laroquebrou", 
            new LatLng(44.967739, 2.1911658), true);
        
        var reilhac = new RallyingPoint(
            "rp8","Reilhac", 
            new LatLng(44.9734047, 2.4192191), true);
        
        var sansac = new RallyingPoint(
            "rp9","Sansac-de-Marmiesse", 
            new LatLng(44.8824607, 2.3485484), true);
        
        var saintsimon = new RallyingPoint(
            "rp10","Saint-Simon", 
            new LatLng(44.9642272, 2.4898166), true);


        // Trip Intents
        DateTime getTime(string timeStr)
        {
             return DateTime.ParseExact(timeStr, "HH:mm", null);
        }

        var blanc = new TripIntent("ti1","1", laroquebrou, arpajon, getTime("09:00"), getTime("17:00"));
        var vert = new TripIntent("ti2","2" ,saintpaul, aurillac, getTime("09:00"), getTime("17:00"));
        var jaune = new TripIntent("ti3","3" ,ytrac, vic, getTime("09:00"), getTime("17:00"));
        var rose = new TripIntent("ti4","4" ,sansac, saintsimon, getTime("09:00"), getTime("17:00"));
        var rouge = new TripIntent("ti5","5", reilhac, vic, getTime("09:00"), getTime("17:00"));
        var bleu = new TripIntent("ti6","6", naucelles, aurillac, getTime("09:00"), getTime("17:00"));

        List<TripIntent> tripIntents = new List<TripIntent>()
        {
            blanc,
            vert,
            jaune,
            rose,
            jaune,
            rouge,
            bleu
        };

        return tripIntents;
    }
}