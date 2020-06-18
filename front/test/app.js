    //      lat, long
var A = [44.5180226, 3.4991057],
B = [44.31901305, 3.57802065202088],
zoom = 11,
center = [ (A[0]+B[0])/2 , (A[1]+B[1])/2 ],
distAB = 0;

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
function getJSON(url,callback){
    var request = new XMLHttpRequest();

    request.onload = function() {
        if ( this.status == 200) {
            var myJson = JSON.parse(this.responseText);
            callback(myJson);
        }
    };
    request.open("GET", url, true);
    request.send();
}


var urlRoute = "http://localhost:5000/route/v1/driving/"+A[1]+','+A[0]+';'+B[1]+','+B[0]+'?overview=full&geometries=geojson';
var affichageRoute = function(json) {
    console.log("GET");

    // Affichage d'info complémentaire
    var infoRoute = document.getElementById("route");
    var text = json.waypoints[0].name;
    text +='\n\tdistance : '+json.routes[0].distance;
    text +='\n\tduration : '+json.routes[0].duration;
    infoRoute.innerText=text;
    distAB = json.routes[0].duration;
    // Affichage du chemin sur la map
    var myStyle = {
        "color": "#0078ff",
        "weight": 4
    };

    var myLayer = L.geoJSON(json.routes[0].geometry,{style: myStyle});
    myLayer.addTo(map);
};

getJSON(urlRoute,affichageRoute);

// Calcul d'alternatives
var urlAlternatives = "http://localhost:5000/route/v1/driving/"+A[1]+','+A[0]+';'+B[1]+','+B[0]+'?alternatives=3&overview=full&geometries=geojson';
var affichageAlternatives = function(json) {
    console.log("GET");

    // Affichage d'info complémentaire
    var infoRoute = document.getElementById("route");
    var text = json.waypoints[0].name;
    text +='\n\tdistance0 : '+json.routes[0].distance/1000+'km';
    text +='\n\tduration0 : '+json.routes[0].duration/60+'min';
    infoRoute.innerText=text;

    // Affichage du chemin sur la map
    var myStyle = {
        "color": "#0078ff",
        "weight": 3,
        "opacity": 0.5
    };

    var n = json.routes.length;
    console.log("alternatives : "+n)
    for (let i = 0; i < n; i++) {
        //const element = array[i];
        var myLayer = L.geoJSON(json.routes[i].geometry,{style: myStyle});
        myLayer.addTo(map);            
    }
};

getJSON(urlAlternatives,affichageAlternatives);

// Calcul de la route avec 3ème point
var D;
for (let i = 0; i < 4; i++) {
    D = [  center[0]+Math.random()*0.1, center[1]+Math.random()*0.1 ];
    var marker = L.marker(D).addTo(map);
    var urlDetour = "http://localhost:5000/route/v1/driving/"+A[1]+','+A[0]+';'+D[1]+','+D[0]+';'+B[1]+','+B[0]+'?overview=full&geometries=geojson';
    var affichageDetour = function(json) {
        console.log("GET");
    
        // Affichage d'info complémentaire
        
        /*var infoRoute = document.getElementById("route");
        var text = json.waypoints[0].name;
        text +='\n\tdistance : '+json.routes[0].distance;
        text +='\n\tduration : '+json.routes[0].duration;
        infoRoute.innerText=text;
        */
        // Affichage du chemin sur la map
        var myStyle = {
            "color": "#ff0000",
            "weight": 2
        };
        //if(json.routes[0].distance-distAB < 10*60){
        console.log(distAB);
        var myLayer = L.geoJSON(json.routes[0].geometry,{style: myStyle});
        myLayer.addTo(map);    
        
    };
    getJSON(urlDetour,affichageDetour);
}


// Todo
var C = [ 44.459232269037294, 3.4613562903244555 ]
var urlObstacle = "http://localhost:5000/route/v1/driving/"+A[1]+','+A[0]+';'+B[1]+','+B[0]+'?overview=full&geometries=geojson';
var affichageObstacle = function(json) {
    console.log("GET");

    // Affichage d'info complémentaire
    var infoRoute = document.getElementById("route");
    var text = json.waypoints[0].name;
    text +='\n\tdistance : '+json.routes[0].distance;
    text +='\n\tduration : '+json.routes[0].duration;
    infoRoute.innerText=text;

    // Affichage du chemin sur la map
    var myStyle = {
        "color": "#0078ff",
        "weight": 4
    };

    var myLayer = L.geoJSON(json.routes[0].geometry,{style: myStyle});
    myLayer.addTo(map);
};