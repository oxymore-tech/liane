    //      lat, long
var A = [44.5180226, 3.4991057],
B = [44.31901305, 3.57802065202088],
zoom = 11,
center = [ (A[0]+B[0])/2 , (A[1]+B[1])/2 ];

// Affichage de la map
//      creer la vue
var map = L.map('map').setView(center,zoom);
//      ajouter l'image(tiles) de fond
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?{foo}',
    {foo: 'bar',
     attribution: 'Map data &copy;\
      <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors,\
       <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
    }).addTo(map);

// Calcul de la route
// request = localhost:5000/route/v1/driving/{coordinates}?option=value&option=value
// ATTENTION inversé coordinates = long,lat;long,lat
var url = "http://localhost:5000/route/v1/driving/"+A[1]+','+A[0]+';'+B[1]+','+B[0]+'?overview=full&geometries=geojson';
var request = new XMLHttpRequest();

request.onload = function() {
    if ( this.status == 200) {
        var myJson = JSON.parse(this.responseText);
        myFunction(myJson);
    }
};
request.open("GET", url, true);
request.send();

function myFunction(json) {
    console.log("GET");
    // Affichage d'info complémentaire
    var infoRoute = document.getElementById("route");
    var text = json.waypoints[0].name;
    text +='\n\tdistance : '+json.routes[0].distance;
    text +='\n\tduration : '+json.routes[0].duration;
    infoRoute.innerText=text;
/*
    var coords = [];
    var i, n=json.routes[0].geometry.coordinates.length;
    for (i = 0; i < n; i++) {        
        const coord = json.routes[0].geometry.coordinates[i];
        coords.push([coord[1],coord[0]]);
    }

    var lineString = {
        "type": "LineString",
        "coordinates": coords
    };
*/

    // Affichage du chemin sur la map
    var myStyle = {
        "color": "#ff7800",
        "weight": 5
    };

    var myLayer = L.geoJSON(json.routes[0].geometry,{style: myStyle});
    myLayer.addTo(map);
};

