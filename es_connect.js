
// We define an EsConnector module that depends on the elasticsearch module.     
var EsConnector = angular.module('EsConnector', ['elasticsearch']);
var place_open;
var placeid12;
var latitude;
var longitude;
// Create the es service from the esFactory
EsConnector.service('es', function (esFactory) {
  return esFactory({ host: 'localhost:9200' });
});

// We define an Angular controller that returns the server health
// Inputs: $scope and the 'es' service

EsConnector.controller('ServerHealthController', function($scope, es) {

    es.cluster.health(function (err, resp) {
        if (err) {
            $scope.data = err.message;
        } else {
            $scope.data = resp;
        }
    });
});

// We define an Angular controller that returns query results,
// Inputs: $scope and the 'es' service

EsConnector.controller('QueryController', function($scope, es) {
// search for documents   
    $scope.search1=function(){        
        $("#search_bar").animate({top: '0px',marginTop:'0px'});
        var div=$("#rest_data");
        div.hide();
        div=$("#displayList");
        div.show();    
        $("#back").hide();
        $("#title_quote").hide();
        var url = "https://maps.googleapis.com/maps/api/geocode/xml?address=" + encodeURI($scope.location) + "&key=AIzaSyCUvpp1wf57w_IWLu615rwF1mnvDU1vr_0";
        $.ajax(
            {
                url: url, 
                dataType: "xml",
                success: function(xml){                    
                    latitude = $(xml).find('lat').first().text();                      
                    longitude=$(xml).find('lng').first().text();
                    var sort_d=$scope.sort_d;
                    var sort_r=$scope.sort_r;
                    if(sort_d){
                        if(sort_r){
                            es.search({
                            index: 'test-index2',
                            size: 100,
                            body: {"fields": ["_source"],
                                "query":{
                                    "filtered" : {
                                        "query" : {
                                            "match" :{
                                                dish_name : $scope.query_term
                                            } 
                                        },
                                    }
                                },
                                "sort": [{
                                                "res_rating": { 
                                                    "order": "desc" 
                                                }
                                            },
                                            {
                                              "_geo_distance": {
                                                "location": { 
                                                  "lat": latitude,
                                                  "lon": longitude,
                                                },
                                                "order":         "asc",
                                                "unit":          "mi", 
                                                "distance_type": "plane" 
                                                }
                                            }
                                ],"script_fields" : {
                                  "distance" : {
                                     "params" : {
                                        "lat" : parseFloat(latitude),
                                        "lon" : parseFloat(longitude)
                                     },
                                     "script" : "doc['location'].distance(lat, lon)"
                                  }
                               }
                            }
                            }).then(function (response) {
                              $scope.hits = response.hits.hits;
                            });                             
                        }else{
                            es.search({
                            index: 'test-index2',
                            size: 100,
                            body: { "fields": ["_source"],
                                "query":{
                                    "filtered" : {
                                        "query" : {
                                            "match" :{
                                                dish_name : $scope.query_term
                                            } 
                                        },
                                    }
                                },
                                "sort": [
                                            {
                                          "_geo_distance": {
                                            "location": { 
                                              "lat": latitude,
                                              "lon": longitude,
                                            },
                                            "order":         "asc",
                                            "unit":          "mi", 
                                            "distance_type": "plane" 
                                          }
                                        }
                                    ]
                            }
                            }).then(function (response) {
                              $scope.hits = response.hits.hits;
                            }); 
                    }
                    
                }else{
                if(sort_r){
                    es.search({
                            index: 'test-index2',
                            size: 100,
                            body: {"fields": ["_source"],
                            "query":{
                                "filtered" : {
                                    "query" : {
                                        "match" :{
                                            dish_name : $scope.query_term
                                        } 
                                    },
                                }
                            },
                           "sort": [ {"res_rating": { 
                                    "order": "desc" 
                                    }
                                     },"_score"                                    
                                   ],
                                "script_fields" : {
                                  "distance" : {
                                     "params" : {
                                        "lat" : parseFloat(latitude),
                                        "lon" : parseFloat(longitude)
                                     },
                                     "script" : "doc['location'].distanceInMiles(lat, lon)"
                                  }
                               }
                        }
                    }).then(function (response) {
                            $scope.hits = response.hits.hits;
                    });    
                }else{
                    es.search({
                            index: 'test-index2',
                            size: 100,
                            body: { 
                                "fields": ["_source"],
                            "query":{
                                "filtered" : {
                                    "query" : {
                                        "match" :{
                                            dish_name : $scope.query_term
                                        } 
                                    },
                                }
                            },"sort": [                                        
                                        "_score"
                                ],
                                "script_fields" : {
                                  "distance" : {
                                     "params" : {
                                        "lat" : parseFloat(latitude),
                                        "lon" : parseFloat(longitude)
                                     },
                                     "script" : "doc['location'].distanceInMiles(lat, lon)"
                                  }
                               }
                        }
                    }).then(function (response) {
                              $scope.hits = response.hits.hits;
                    });
                }
            }
                
        }
                
    });
                   
}    
     $scope.search2=function(data){
        $scope.clicked_data=data;
        $scope.rev_dish=data['review']; 
        var div=$("#rest_data");
        div.show();
        div=$("#displayList");
        div.hide();    
        $("#back").show();
        es.search({
            index: 'test-index1',
            size: 50,
            body: {
            "query":
                {
                    "match": {
                        id:data['res_id']
                    }   
                },
            }

            }).then(function (response) {
                $scope.item1 = response.hits.hits;
                var dest_lat=response.hits.hits[0]['_source']['lat'];
                var dest_lon=response.hits.hits[0]['_source']['lon']
                $scope.reviews=$scope.item1[0]['_source']['reviews'];
                $scope.menu=$scope.item1[0]['_source']['menu'];
                $scope.myFunction(latitude,longitude,dest_lat,dest_lon);
                $scope.openhours($scope.item1[0]['_source']['lat'],$scope.item1[0]['_source']['lon']);                
            });        
    }
     
    $scope.openhours=function(lat1,lon1){
            var pyrmont = new google.maps.LatLng(lat1, lon1);
            var map = new google.maps.Map(document.getElementById('map'), {
            center: pyrmont,
            zoom: 15,
            scrollwheel: false
            });

            var request = {
                            location: pyrmont,
                            radius: '500',
                            types: ['store']
                        };            
            var service = new google.maps.places.PlacesService(map);           
            service.nearbySearch(request, function(results, status) {
            if (status == google.maps.places.PlacesServiceStatus.OK) 
            {
                placeid12 = results[0].place_id;
            }
            });
            var request2 = {
                placeId: placeid12
            };         
            var service2 = new google.maps.places.PlacesService(map);
            service2.getDetails(request2, function (place, status) {
                if (status == google.maps.places.PlacesServiceStatus.OK) {                                
                    if(place.opening_hours.open_now){
                        $("#open_now").html("<p style='color:Green;'>Open Now</p>");
                    }else{
                        $("#open_now").html("<p style='color:Red;'>Closed Now</p>");
                    }
                }
            });
       
}
    
    $scope.myFunction=function(lat1,lon1,lat2,lon2) {
        var directionsService = new google.maps.DirectionsService;
        var directionsDisplay = new google.maps.DirectionsRenderer;
        var map = new google.maps.Map(document.getElementById('map1'), {
        zoom: 7,
        center: {lat: parseFloat(lat1), lng: parseFloat(lon1)}
      });
  directionsDisplay.setMap(map);
  $scope.calculateAndDisplayRoute(directionsService, directionsDisplay,lat1,lon1,lat2,lon2);
}
  $scope.calculateAndDisplayRoute=function(directionsService, directionsDisplay,lat1,lon1,orglat,orglon) {
  var des_lat = parseFloat(orglat);
    var dest_lon = parseFloat(orglon);
  directionsService.route({
    origin: parseFloat(lat1)+','+parseFloat(lon1),
    destination: des_lat +','+ dest_lon,
    travelMode: google.maps.TravelMode.DRIVING
  }, function(response, status) {
    if (status === google.maps.DirectionsStatus.OK) {
      directionsDisplay.setDirections(response);
    } else {
      window.alert('Directions request failed due to ' + status);
    }
  });

}
});

$(document).ready(function(){
    var $window = $(window);
    $stickyEl = $('#search_bar');
    elTop = 2;

   $window.scroll(function() {     
        $stickyEl.toggleClass('sticky', $window.scrollTop() > elTop);
    });
    
    $("#back").hide();
    $("#review").click(function(){
        $("#menu_data").hide();
        $("#other_rev_data").hide();      
        $("#rev_data").show();
        $("#review").css("background-color","crimson");
        $("#menu").css("background-color","black");
        $("#other_review").css("background-color","black");
    });
     $("#menu").click(function(){
        $("#menu_data").show();
        $("#other_rev_data").hide();      
        $("#rev_data").hide();       
        $("#review").css("background-color","black");
        $("#menu").css("background-color","crimson");
        $("#other_review").css("background-color","black");
    });
     $("#other_review").click(function(){
        $("#menu_data").hide();
        $("#other_rev_data").show();      
        $("#rev_data").hide();   
        $("#review").css("background-color","black");
        $("#other_review").css("background-color","crimson");
        $("#menu").css("background-color","black") ;
    });
    
    $("#back").click(function(){
        $("#displayList").show();
        $("#rest_data").hide();     
        $("#back").hide();
    });    
});


