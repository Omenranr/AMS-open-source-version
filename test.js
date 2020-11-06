planet = {};
var index = 0;

var opacity = 0;
var collectionSize = 0;
var coords;

var initRGB = 0;
var initNDVI = 0;
var initNDWI = 0;
var initVar = 0;
var initWaterNeed = 0;

var _dateImage = 0;
var _yday = 0;
var _res = 10;
var _elevation = 0;
var _et0 = 0;
var _tempMean = 0;
var _wind = 0;
var _solarRad = 0;
var _rain = 0;
var _waterneed = 0;
var lat = 0;
var lng = 0;

var ButtonsState = {
    RGB_BTN:false,
    Biomass_BTN:false,
    Moisture_BTN:false,
    B_Var_BTN:false,
    M_Var_BTN:false,
    WaterNeed_BTN:false
};

planet.boot = function(eeMapId, eeToken) {

        var app = new planet.App();
        planet.instance = app;
    
};

planet.App = function() {

    $(".bm-banner").html("");
    $(".loader").hide();
    $(".barwater").hide();
    $(".barndvi").hide();
    $(".barmoisture").hide();
    $(".barvar").hide();
    
    // Create the search box and link it to the UI element.
    var input = document.getElementById('pac-input');
    var searchBox = new google.maps.places.SearchBox(input);
    
    this._map = this.createMap();
    this._map.setMapTypeId("OSM");
    this._map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    //this.zoom(this,this._map)
    initAutocomplete(this._map,searchBox,this);
    this._drawingManager = this.createDrawingManager(this, this._map);
    this._overlays = [];
    this.initPanButton(this, $("#pan-button"), this._map, this._drawingManager);
    this.initPixelButton(this, $("#pixel-button"), this._map, this._drawingManager);
    this.initRegionButton(this, $("#region-button"), this._map, this._drawingManager);
    this.initCleanButton(this, $("#clean-button"), this._map, this._drawingManager);
    this.initVisibilityButton(this, $("#visibility-button"), this._map, this._drawingManager);
    //this.initMapClicked(this, this._map);
    this.locationChange(this, this._map,searchBox);
    this.opacitySliders(this);
    //this.iterateoverData(this, $("#past-button"),$("#next-button"));
    this.initRegionPicker();
    
    // init Index Buttons
    this.initRGBButton(this, $("#btn1"));
    this.initNDVIButton(this, $("#btn2"));
    this.initNDWIButton(this, $("#btn3"));
    this.initVarBioButton(this, $("#btn4"));
    this.initWaterNeedButton(this, $("#btn5"));
    
	var welcomeMessage = 'Please use "MyField" to mark an area and get fresh satellite data';
	createSnackbar(welcomeMessage);
	
}

planet.App.EE_URL = "https://earthengine.googleapis.com";
planet.App.DEFAULT_ZOOM = 4;
planet.App.DEFAULT_CENTER = {lng: 11.57, lat: 48.13};
planet.App.STATUS = {PAN:0, PICK_UP_PIXEL:1, PICK_UP_REGION:2, RGB:3};
planet.App.prototype._current_status = planet.App.STATUS.PAN;


planet.App.getEeMapType = function(eeMapId, eeToken) {
    var eeMapOptions = {
        getTileUrl:function(tile, zoom) {
            var url = planet.App.EE_URL + "/map/";
            url += [eeMapId, zoom, tile.x, tile.y].join("/");
            url += "?token=" + eeToken;
            //console.log(url)
            return url;
        },
        tileSize: new google.maps.Size(256, 256)
    };
    return new google.maps.ImageMapType(eeMapOptions);
}

planet.App.prototype.createMap = function() {
    var mapOptions = {
        backgroundColor: '#333333',
        center: planet.App.DEFAULT_CENTER,
        disableDefaultUI: false,
        zoom: planet.App.DEFAULT_ZOOM,
        fullscreenControl: false,
        mapTypeControl: true,
        //mapTypeId: google.maps.MapTypeId.HYBRID,
        //mapTypeId: google.maps.MapTypeId.TERRAIN,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            mapTypeIds: [google.maps.MapTypeId.HYBRID, 'OSM','LIVE','NIGHT'],
            position: google.maps.ControlPosition.BOTTOM_LEFT,
        }
    }

    var node = $('.bm-map').get(0);
    var map = new google.maps.Map(node, mapOptions);
    
    map.mapTypes.set("OSM", new google.maps.ImageMapType({
    getTileUrl: function (coord, zoom) {
        return "https://tile.openstreetmap.org/" + 
        zoom + "/" + coord.x + "/" + coord.y + ".png";
    },
    tileSize: new google.maps.Size(256, 256),
    name: "OSMap",
    maxZoom: 18
    }));
    
    //style muss YYYY-MM-DD sein
    var viirs_time = this.getDate(1,'MODIS'); 
    var getVIIRS250Url = function(tile, zoom) {

    	if (zoom <= 9){
    		
	        return "https://gibs.earthdata.nasa.gov/wmts-webmerc/" +         
	        "VIIRS_SNPP_CorrectedReflectance_TrueColor/default/" + 
	        viirs_time + "/GoogleMapsCompatible_Level9/" + 
	        zoom + "/" + tile.y + "/" + tile.x + ".jpg";
    	}else{
    		map.setMapTypeId(google.maps.MapTypeId.HYBRID);
    		var _message = 'Live Modus works only for high zoom levels. Please zoom out.';
            //var _message = 'The Service is currently updated and will be available tomorrow';
            createSnackbar(_message);
    	}
    };
    
    var modis_time = this.getDate(0,'MODIS');
    var getMODIS250Url = function(tile, zoom) {

    	if (zoom <= 14){
    		return "http://gibs.earthdata.nasa.gov/wmts-webmerc/" +         
            "MODIS_Terra_CorrectedReflectance_TrueColor/default/" + 
            modis_time + "/GoogleMapsCompatible_Level9/" + 
            zoom + "/" + tile.y + "/" + tile.x + ".jpg";
    	}
        
    };
    
    var getNightUrl = function(tile, zoom) {

        return "http://gibs.earthdata.nasa.gov/wmts-webmerc/" +
               "VIIRS_CityLights_2012/default/2012-04-03/" +
               "GoogleMapsCompatible_Level8/" +
                zoom + "/" + tile.y + "/" +
                tile.x + ".jpg";
    };
  
    /*var epic_lastimage;
    var epic_time;
    
    var url = 'http://epic.gsfc.nasa.gov/api/natural';
    $.ajax(url, { 
        success : function(iDataArr, stat, xhr) { 
            var size = iDataArr.length;
            epic_lastimage = iDataArr[size-1].image;
            epic_time = iDataArr[size-1].date;
        }
    });

    var getEPIC = function(tile, zoom) {
        ;
        //01-01-2017
        var epic_style_time = epic_time.slice(0,10);
        epic_style_time = epic_style_time.replace(/-/g,"/");
        
        return "http://epic.gsfc.nasa.gov/archive/natural/"
        + epic_style_time + "/png/"+ epic_lastimage + ".png";
    };*/
    
    map.mapTypes.set("LIVE", new google.maps.ImageMapType({
        getTileUrl:  getVIIRS250Url,
        tileSize: new google.maps.Size(256, 256),
        name: "LIVE",
        maxZoom: 14,
        minZoom: 2,
        opacity: 1
    }));
    
    map.mapTypes.set("NIGHT", new google.maps.ImageMapType({
        getTileUrl:  getNightUrl,
        tileSize: new google.maps.Size(256, 256),
        name: "NIGHT",
        maxZoom: 8,
        minZoom: 2,
        opacity: 1
    }));
    
    /*map.mapTypes.set("EPIC", new google.maps.ImageMapType({
        getTileUrl:  getEPIC,
        tileSize: new google.maps.Size(1100, 1100),
        name: "EPIC",
        maxZoom: 8,
        opacity: 0.9
    }));*/

     //init coordiantes
    $('#locationLat').val(planet.App.DEFAULT_CENTER.lat);
    $('#locationLng').val(planet.App.DEFAULT_CENTER.lng);
    
    
    return map;
}

planet.App.prototype.zoom = function(self,map) {
   // debugger
    map.addListener('zoom_changed', function () {

    	debugger
        if(map.getZoom() <= 9 && map.getMapTypeId() =='LIVE'){

           //map.setMapTypeId("EPIC"); 
           //map.setOptions({draggable: false});
           
        }
        else if(map.getZoom() > 14 && map.getMapTypeId() =='OSM'){
        	
          map.setMapTypeId(google.maps.MapTypeId.HYBRID); 
             
        }
    }); 
};

// get Data for new Location, cache it and put it into overlay 
planet.App.prototype.locationChange = function(self,map,searchBox) {

    searchBox.addListener('places_changed', function() {
    
    map.setMapTypeId(google.maps.MapTypeId.HYBRID);
    var places = searchBox.getPlaces();
    if (places.length == 0) {
      return;
    }
    places.forEach(function(place) {
    lat = place.geometry.location.lat().toFixed(3);
    lng = place.geometry.location.lng().toFixed(3);
    });
        
    //reset everthing when a new location was typed 
    index = 0;
    self.setDrawingModeEnabled.bind(this, false)
    self.clearPolygon.bind(this)
    $('.bm-console').html("");
    
    });
         
};

// get the current hyperlocal weather from Darksky
planet.App.prototype.getWetter = function() {

    if(lat || lng != 0){
        
    var loc = 'https://darksky.net/'+lat+','+lng+'#week?embed=true&timeControl=true&fieldControl=false&units=si';
    document.getElementById('test').setAttribute('src', loc);
    //console.log("Teste",loc)
    }
}

    
planet.App.prototype.createDrawingManager = function(self, map) {
    var drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
        polygonOptions: {
            fillColor:'#ffff00',strokeWeight:2,strokeColor:'#ffff00',
            fillOpacity: 0,
            editable: false, clickable: true,
            draggable: false
        }
    });

    google.maps.event.addListener(drawingManager, 'polygoncomplete', function(polygon) {
        self._overlays.push(polygon);
        coords = self.getCoordinates(polygon.getPath()); 
        
        //self.initNDWI(self,coords,index);
        //self.initNDVI(self,coords,index);
        //self.initRGB(self,coords,index);
        //self.initVar(self,coords,index);
        var _message = 'Loading your data takes one minute';
        //var _message = 'The Service is currently updated and will be available tomorrow';
        createSnackbar(_message);
        
        self.getData(self,coords,index);
        self.getSize(planet.instance,lat,lng)
                   
    });

    drawingManager.setMap(map);
    return drawingManager;
}

planet.App.prototype.getCoordinates = function(path) {
    var coords = ""
    var pathArray = path.getArray();
    for(var i = 0; i<pathArray.length; i++){
        var latLng = pathArray[i];
        if (i>0) coords += ","
        coords += latLng.lng() + "," + latLng.lat();
    }
    return coords;    
}

planet.App.prototype.initMapClicked = function(self, map) {
    map.addListener('click', function(e) {
        ;
        if (self._current_status == planet.App.STATUS.PICK_UP_PIXEL) {
            //self.waiting(); 
            self.getPixelValue(self, e.latLng.lat(), e.latLng.lng());
        }
    });
}

planet.App.prototype.initPixelButton = function(self, btn, map, mgr) {
    $(btn).click(function(e){
        self._current_status = planet.App.STATUS.PICK_UP_PIXEL;
        map.setOptions({draggableCursor:'crosshair'});
        mgr.setDrawingMode(null);
    });
}

planet.App.prototype.initRegionButton = function(self, btn, map, mgr) {
    $(btn).click(function(e){
        self._current_status = planet.App.STATUS.PICK_UP_REGION;
        mgr.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
    });
}

planet.App.prototype.initPanButton = function(self, btn, map, mgr) {
    $(btn).click(function(e){
        self._current_status = planet.App.STATUS.PAN;
        map.setOptions({draggableCursor:''});
        mgr.setDrawingMode(null);
    });
}

planet.App.prototype.initCleanButton = function(self, btn, map, mgr) {
    $(btn).click(function(e){
        for(var i=0; i<self._overlays.length; i++) {
            self._overlays[i].setMap(null);
        }
        self._overlays = [];
        $('.bm-console').html("");
    });
}
planet.App.prototype.clean = function() {

        $('.bm-console').value("");
}

planet.App.prototype.initVisibilityButton = function(self, btn, map, mgr) {
            var nav = $(".visibility-button");
            nav.click(function() {

                var target = $($(this).attr('href') + '-page');
                target.addClass('active').toggle(500);
                        $('.page:visible').not(target).removeClass('active').toggle(500);
                return false;
            });

            $(".page button").click(function() {
                $(".page").hide(1000);
            }); 
}

planet.App.prototype.getPixelValue = function(self, lat, lng) {
    $.ajax({
        type: 'GET',
        async: true,
        url: '/pixelVal?',
        dataType: 'json',
        data: {'lat':lat, 'lng':lng},
        beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
        success: function(data){ self.showPixelVal(data); },
        error: function(data){ alert("Error getting Pixel"); }
    });
}

planet.App.prototype.getRegionValue = function(self, coords) {
    $.ajax({
        type: 'GET',
        async: true,
        url: '/regionVal?',
        dataType: 'json',
        data: {'coordinates':coords},
        beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
        success: function(data){ self.showRegionVal(data); },
        error: function(data){ alert("Error getting Region"); }
    });
}

planet.App.prototype.showImageInfo = function(vals) {

    var keys = ["Date:", "Resolution:", "Longitude:", "Latitude:","Elevation:","mean_T:","Wind:","SolarRad:","ET0:","Rain:"]
    this.showInfo(keys, vals)
  
}

planet.App.prototype.getSize = function(self, lat, lng) {
  

    // query collection size
    $.ajax({
      type: 'GET',
      async: true,
      url: "/size?",
      dataType: "json",
      data: {'lat':lat, 'lng':lng},
      beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
      success: function (data) {

        var keys = ["size"]
        collectionSize = data[keys]
        
      },
      error: function (data) {
          alert("Error getting RGB");
      }
    });  
}

planet.App.prototype.showPixelVal = function(vals) {
    var keys = ["Biomass",  "Longitude", "Latitude"]
    this.showValues(keys, vals)
}

planet.App.prototype.showRegionVal = function(vals) {
    var keys = ["count", "area", "min", "max", "sum", "mean", "stddev"];
    this.showValues(keys, vals)
}

planet.App.prototype.showInfo = function(keys, vals) {
    var content = "<center><table class='bm-table'>";
    for(var i=0; i<keys.length; i++){
   
        key = keys[i];
        if(key == "Date:"){
        	_dateImage = vals[key]
        }else if(key == "Resolution:"){
        	_res = vals[key];
        }else if(key == "Elevation:"){
        	_elevation = vals[key];
        }else if(key == "ET0:"){
        	_et0 = vals[key];
        }else if(key == "WaterNeed:"){
        	_waterneed = vals[key];
        }else if(key == "mean_T:"){
        	_tempMean = vals[key];
        }else if(key == "Wind:"){
        	_wind = vals[key];
        }else if(key == "SolarRad:"){
        	_solarRad = vals[key];
        }else if(key == "Rain:"){
        	_rain = vals[key];
        }
        
        //content += "<tr><td>" + key + "</td><td>" + (vals[key] == null ? 'No Data' : vals[key])+ "</td></tr>";
    }
    content += "</table></center>";
    $('.bm-console').html(content);    
}

planet.App.prototype.showWaterInfo = function() {
	var keys = ["Date:", "Resolution:","Elevation:","mean_T:","Wind:","SolarRad:","ET0:","Rain:"];
    var content = "<center><table class='bm-table'>";
    for(var i=0; i<keys.length; i++){
        key = keys[i];

        if(key == "Date:"){
        	content += "<tr><td>" + key + "</td><td>" + this.getDate(1,'MODIS'); + "</td></tr>";
        }else if(key == "Resolution:"){
        	content += "<tr><td>" + key + "</td><td>" + _res + " m" +"</td></tr>";
        }else if(key == "Elevation:"){
        	content += "<tr><td>" + key + "</td><td>" + _elevation + " m" + "</td></tr>";
        }else if(key == "mean_T:"){
        	content += "<tr><td>" + key + "</td><td>" + _tempMean + " C" + "</td></tr>";
        }else if(key == "Wind:"){
        	content += "<tr><td>" + key + "</td><td>" + _wind + " m/s" + "</td></tr>";
        }else if(key == "SolarRad:"){
        	content += "<tr><td>" + key + "</td><td>" + _solarRad + " MJ" + "</td></tr>";
        }else if(key == "ET0:"){
        	content += "<tr><td>" + key + "</td><td>" + _et0 + " mm" + "</td></tr>";
        }else if(key == "Rain:"){
        	content += "<tr><td>" + key + "</td><td>" + _rain + " mm" + "</td></tr>";
        }else if(key == "WaterNeed:"){
        	content += "<tr><td>" + key + "</td><td>" + _waterneed + " mm" + "</td></tr>";
        }
        	
    }
    content += "</table></center>";
    $('.bm-console').html(content);    
}

planet.App.prototype.showLogInfo = function() {
	var keys = ["Date:", "Resolution:", "Latitude:", "Longitude:","Elevation:","ET0:"];
    var content = "<center><table class='bm-table'>";
    for(var i=0; i<keys.length; i++){
        key = keys[i];

        if(key == "Date:"){
        	content += "<tr><td>" + key + "</td><td>" + _dateImage + "</td></tr>";
        }else if(key == "Resolution:"){
        	content += "<tr><td>" + key + "</td><td>" + _res +  " m" +"</td></tr>";
        }else if(key == "Latitude:"){
        	content += "<tr><td>" + key + "</td><td>" + lat +  "</td></tr>";
        }else if(key == "Longitude:"){
        	content += "<tr><td>" + key + "</td><td>" + lng +  "</td></tr>";
        }else if(key == "Elevation:"){
        	content += "<tr><td>" + key + "</td><td>" + _elevation +  " m" + "</td></tr>";
        }   	
    }
    content += "</table></center>";
    $('.bm-console').html(content);    
}

planet.App.prototype.showValues = function(keys, vals) {
    var content = "<center><table class='bm-table'>";
    for(var i=0; i<keys.length; i++){
        key = keys[i];
        content += "<tr><td>" + key + "</td><td>" + (vals[key] == null ? 'No Data' : this.fmtNum(vals[key]))+ "</td></tr>";
    }
    content += "</table></center>";
    $('.bm-console').html(content);    
}

planet.App.prototype.waiting = function() {
    $(".bm-console").html("<center><div data-loader='circle'>---</div>Loading</center>")
}

planet.App.prototype.fmtNum = function(coor) {
    return Math.round(coor * 10000) / 10000.0 
}


var repeat = 0;
planet.App.prototype.getData = function(self, coords, index) {
  
	$(".loader").show();
	
    $.ajax({
        type: 'GET',
        async: true,
        url: '/data?',
        dataType: 'json',
        data: {'coordinates':coords, 'index':index},
        beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
        success: function(data){
            
            self.setMap('rgb',data);
            self.setMap('ndvi',data);
            self.setMap('ndwi',data);
            self.setMap('var_bio',data);
            self.setMap('WaterNeed',data);
            
            self.setLayerOpacity('rgb', + ButtonsState.RGB_BTN);
            self.setLayerOpacity('ndvi', + ButtonsState.Biomass_BTN);
            self.setLayerOpacity('ndwi', + ButtonsState.Moisture_BTN);
            self.setLayerOpacity('var_bio', + ButtonsState.B_Var_BTN);
            self.setLayerOpacity('WaterNeed', + ButtonsState.WaterNeed_BTN);
            
            $(".loader").hide();
            //start the cache filling
            //self.fillCache()
            
            //alert("Wait for 5 seconds.");
            //self.sleep(500)
            //self.fillRGBCache()
            //self.sleep(500)
            //self.fillNDVICache()
            //self.sleep(500)
            //self.fillNDWICache()
            //self.sleep(500)
            //self.fillVarianceCache()
            
            repeat = 0;
        },
        error: function(data){ 
            
            if(repeat < 3){
                //sleep for one sek and try again
                self.sleep(1000)
                self.getData(self,coords,index);
                repeat++;
            }else{
            	$(".loader").hide();
                alert("Error getting data. Please try again");
                self.setDrawingModeEnabled.bind(this, false)
                self.clearPolygon.bind(this)
            }
        }
    });
   
}

var repeat = 0;
planet.App.prototype.initRGB = function(self, coords, index) {

    $(".loader").show();
    
    $.ajax({
        type: 'GET',
        async: true,
        url: '/initRGB2?',
        dataType: 'json',
        data: {'coordinates':coords, 'index':index},
        beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
        success: function(data){
            
            self.setMap('rgb',data);
            self.setLayerOpacity('rgb', +ButtonsState.RGB_BTN);
            
            repeat = 0;
            initRGB = 1;
            
            /*if(initRGB == 1 && initNDVI == 1 && initNDWI == 1 && initVar == 1){
                    
            self.fillRGBCache()
            self.sleep(500)
            self.fillNDVICache()
            self.sleep(500)
            self.fillNDWICache()
            self.sleep(500)
            self.fillVarianceCache()
            } */  
        },
        error: function(data){ 
            if(repeat < 3){
                //sleep for one sek and try again
                self.sleep(1)
                self.initRGB(self,coords,index);
                repeat++;
                
            }else{
                alert("Error getting data. Please try again");
            }
        }
    });
   
}

var repeat = 0;
planet.App.prototype.initNDVI = function(self, coords, index) {
    
    $.ajax({
        type: 'GET',
        async: true,
        url: '/initNDVI?',
        dataType: 'json',
        data: {'coordinates':coords, 'index':index},
        beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
        success: function(data){
            
     
            self.setMap('ndvi',data);
            self.setLayerOpacity('ndvi', +ButtonsState.Biomass_BTN);
            self.setLayerOpacity('WaterNeed', +ButtonsState.WaterNeed_BTN);

            repeat = 0;
            initNDVI = 1;
            /*if(initRGB == 1 && initNDVI == 1 && initNDWI == 1 && initVar == 1){
                    
                self.fillRGBCache()
                self.sleep(500)
                self.fillNDVICache()
                self.sleep(500)
                self.fillNDWICache()
                self.sleep(500)
                self.fillVarianceCache()
            }   */
        },
        error: function(data){ 
            if(repeat < 3){
                //sleep for one sek and try again
                self.sleep(1)
                self.initNDVI(self,coords,index);
                repeat++;
                
                
            }else{
                alert("Error getting data. Please try again");
            }
        }
    });
   
}
var repeat = 0;
planet.App.prototype.initNDWI = function(self, coords, index) {

    
    $.ajax({
        type: 'GET',
        async: true,
        url: '/initNDWI?',
        dataType: 'json',
        data: {'coordinates':coords, 'index':index},
        beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
        success: function(data){
            
            self.setMap('ndwi',data);
            self.setLayerOpacity('ndwi', +ButtonsState.Moisture_BTN);
            
            repeat = 0;
            initNDWI = 1;
            /*if(initRGB == 1 && initNDVI == 1 && initNDWI == 1 && initVar == 1){
                    
                self.fillRGBCache()
                self.sleep(500)
                self.fillNDVICache()
                self.sleep(500)
                self.fillNDWICache()
                self.sleep(500)
                self.fillVarianceCache()
            }*/
        },
        error: function(data){ 
            if(repeat < 3){
                //sleep for one sek and try again
                self.sleep(1)
                self.initNDWI(self,coords,index);
                repeat++;
                
            }else{
                alert("Error getting data. Please try again");
            }
        }
    });
   
}
var repeat = 0;
planet.App.prototype.initVar = function(self, coords, index) {

    
    $.ajax({
        type: 'GET',
        async: true,
        url: '/initVar?',
        dataType: 'json',
        data: {'coordinates':coords, 'index':index},
        beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
        success: function(data){
            
            self.setMap('var_bio',data);
            self.setLayerOpacity('var_bio', +ButtonsState.B_Var_BTN);
            repeat = 0;
            initVar = 1;
            
            /*if(initRGB == 1 && initNDVI == 1 && initNDWI == 1 && initVar == 1){
                    
                self.fillRGBCache()
                self.sleep(500)
                self.fillNDVICache()
                self.sleep(500)
                self.fillNDWICache()
                self.sleep(500)
                self.fillVarianceCache()
            }*/

        },
        error: function(data){ 
            if(repeat < 3){
                //sleep for one sek and try again
                self.sleep(1)
                self.initVar(self,coords,index);
                repeat++;
                
                
            }else{

                alert("Error getting data. Please try again");
            }
        }
    });
   
}
planet.App.prototype.sleep = function(delay) {
    var start = new Date().getTime();
    while (new Date().getTime() < start + delay);
}

//fill the cache in the background
planet.App.prototype.fillRGBCache = function(self) {

    
    
    $.ajax({
        type: 'GET',
        async: true,
        url: '/fillRGBCache?',
        dataType: 'json',
        beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
        success: function(){

        },
        error: function(){ 
            //alert("Cache filling error"); 
        }
    });
}

//fill the cache in the background
planet.App.prototype.fillNDVICache = function(self) {

    
    
    $.ajax({
        type: 'GET',
        async: true,
        url: '/fillNDVICache?',
        dataType: 'json',
        beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
        success: function(){

        },
        error: function(){ 
            //alert("Cache filling error"); 
        }
    });
}

//fill the cache in the background
planet.App.prototype.fillNDWICache = function(self) {

    
    
    $.ajax({
        type: 'GET',
        async: true,
        url: '/fillNDWICache?',
        dataType: 'json',
        beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
        success: function(){

        },
        error: function(){ 
            //alert("Cache filling error"); 
        }
    });
}
//fill the cache in the background
planet.App.prototype.fillVarianceCache = function(self) {

    
   debugger 
    $.ajax({
        type: 'GET',
        async: true,
        url: '/fillVarianceCache?',
        dataType: 'json',
        beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
        success: function(){
            debugger
        },
        error: function(){ 
            //alert("Cache filling error"); 
            debugger
        }
    });
}
// get image from past referenced by index
planet.App.prototype.lookupRGB = function(self, index) {

    $(".loader").show();
    // query new map
    
    $.ajax({
      type: 'GET',
      async: true,
      url: "/lookupRGB?",
      dataType: "json",
      data: {'index':index},
      beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
      success: function (data) {
            self.setMap('rgb',data);
            self.setLayerOpacity('rgb', +ButtonsState.RGB_BTN);
      },
      error: function (data) {
          alert("Maximum Satellite Data availability reached");
      }
    });
};

// get image from past referenced by index
planet.App.prototype.lookupNDVI = function(self, index) {

    $(".loader").show();
    // query new map
    
    $.ajax({
      type: 'GET',
      async: true,
      url: "/lookupNDVI?",
      dataType: "json",
      data: {'index':index},
      beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
      success: function (data) {
            self.setMap('ndvi',data);
            self.setLayerOpacity('ndvi', +ButtonsState.Biomass_BTN);
      },
      error: function (data) {

      }
    });
};

// get image from past referenced by index
planet.App.prototype.lookupNDWI = function(self, index) {

    $(".loader").show();
    // query new map
    
    $.ajax({
      type: 'GET',
      async: true,
      url: "/lookupNDWI?",
      dataType: "json",
      data: {'index':index},
      beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
      success: function (data) {

            self.setMap('ndwi',data);
            self.setLayerOpacity('ndwi', +ButtonsState.Moisture_BTN);
      },
      error: function (data) {

      }
    });
};

// get image from past referenced by index
planet.App.prototype.lookupVariance = function(self, index) {

    $(".loader").show();
    // query new map
    
    $.ajax({
      type: 'GET',
      async: true,
      url: "/lookupVariance?",
      dataType: "json",
      data: {'index':index},
      beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
      success: function (data) {
            self.setMap('var_bio',data);
            self.setLayerOpacity('var_bio', +ButtonsState.B_Var_BTN);
      },
      error: function (data) {

      }
    });
};
// get RGB via server.py
planet.App.prototype.getCIR = function(self, lat, lng, index) {
  
    var name = 'cir';
    $(".loader").show();
    // query new map
    $.ajax({
      type: 'GET',
      async: true,
      url: "/cir?",
      dataType: "json",
      data: {'lat':lat, 'lng':lng, 'index':index},
      beforeSend: function(xhr){ xhr.setRequestHeader('Accept', 'application/json'); },
      success: function (data) {
		self.setMap(name,data);
        self.setLayerOpacity(name, opacityCIR);  
      },
      error: function (data) {
          alert("Error getting CIR");
      }
    });
};


// Push map with mapId and token obtained from EE Python
planet.App.prototype.setMap = function(name,data) {

  this.showLoadingAlert(name);

  // obtain new layer
  //OverlayMapType interface for map layers on top of a base Google....Map. immer den aktuellen Stand von ee_api_js.js halten

    var mapType;
    if(name == 'rgb'){
        this.showImageInfo(data);

        var eeTileSource = new ee.layers.EarthEngineTileSource(
                'https://earthengine.googleapis.com/map',
                data.eeMapId_rgb, data.eeToken_rgb);
        var mapOptions = {name: name};
        var mapType = new ee.layers.ImageOverlay(eeTileSource,mapOptions);
      
        // remove old layer
        this.removeLayer(name);
        // add new layer
        this._map.overlayMapTypes.push(mapType);
        
    }else if(name == 'ndvi'){
    	var eeTileSource = new ee.layers.EarthEngineTileSource(
                'https://earthengine.googleapis.com/map',
                data.eeMapId_ndvi, data.eeToken_ndvi);
    	var mapOptions = {name: name};
        var mapType = new ee.layers.ImageOverlay(eeTileSource,mapOptions);
        
        //mapType = new ee.MapLayerOverlay(planet.App.EE_URL + '/map', data.eeMapId_ndvi, data.eeToken_ndvi, {name: name});

        this.removeLayer(name);
        this._map.overlayMapTypes.push(mapType);
        
    }else if(name == 'cir'){
    	var eeTileSource = new ee.layers.EarthEngineTileSource(
                'https://earthengine.googleapis.com/map',
                data.eeMapId_cir, data.eeToken_cir);
    	var mapOptions = {name: name};
        var mapType = new ee.layers.ImageOverlay(eeTileSource,mapOptions);
        //mapType = new ee.MapLayerOverlay(planet.App.EE_URL + '/map', data.eeMapId_cir, data.eeToken_cir, {name: name});
   
        this.removeLayer(name);
        this._map.overlayMapTypes.push(mapType);
    }
    else if(name == 'ndwi'){
    	var eeTileSource = new ee.layers.EarthEngineTileSource(
                'https://earthengine.googleapis.com/map',
                data.eeMapId_ndwi, data.eeToken_ndwi);
    	var mapOptions = {name: name};
        var mapType = new ee.layers.ImageOverlay(eeTileSource,mapOptions);
        //mapType = new ee.MapLayerOverlay(planet.App.EE_URL + '/map', data.eeMapId_ndwi, data.eeToken_ndwi, {name: name});

        this.removeLayer(name);
        this._map.overlayMapTypes.push(mapType);
    }
    else if(name == 'var_bio'){
    	var eeTileSource = new ee.layers.EarthEngineTileSource(
                'https://earthengine.googleapis.com/map',
                data.eeMapId_var_bio, data.eeToken_var_bio);
    	var mapOptions = {name: name};
        var mapType = new ee.layers.ImageOverlay(eeTileSource,mapOptions);
        //mapType = new ee.MapLayerOverlay(planet.App.EE_URL + '/map', data.eeMapId_var_bio, data.eeToken_var_bio, {name: name});
        // remove old layer
        this.removeLayer(name);
        this._map.overlayMapTypes.push(mapType);
    }
    else if(name == 'WaterNeed'){
    	var eeTileSource = new ee.layers.EarthEngineTileSource(
                'https://earthengine.googleapis.com/map',
                data.eeMapId_etc, data.eeToken_etc);
    	var mapOptions = {name: name};
        var mapType = new ee.layers.ImageOverlay(eeTileSource,mapOptions);
        //mapType = new ee.MapLayerOverlay(planet.App.EE_URL + '/map', data.eeMapId_etc, data.eeToken_etc, {name: name});

        this.removeLayer(name);
        this._map.overlayMapTypes.push(mapType);
    }

 
    
  mapType.addTileCallback((function(event) {
    if (event.count === 0) {
    	//$(".loader").hide();

    } else {
    	//$(".loader").show();

	}
  }).bind(this));
  
};

/**
 * Removes the map layer(s) with the given name.
 * @param {string} name The name of the layer(s) to remove.
 */
planet.App.prototype.removeLayer = function(name) {
  this._map.overlayMapTypes.forEach((function(mapType, index) {
    if (mapType && mapType.name == name) {
      this._map.overlayMapTypes.removeAt(index);
    }
  }).bind(this));
};

/**
 * Changes the opacity of the map layer(s) with the given name.
 * @param {string} name The name of the layer(s) to remove.
 */
planet.App.prototype.setLayerOpacity = function(name, value) {

   // debugger
  this._map.overlayMapTypes.forEach((function(mapType, index) {
      //console.log("MapTypeNme", mapType.name);
      //console.log(value);
    if (mapType && mapType.name == name) {
	  var overlay = this._map.overlayMapTypes.getAt(index);
      overlay.setOpacity(value);
    }
  }).bind(this));
};


planet.App.prototype.opacitySliders = function(self) {
 
    $('#biomassControl').on("slide", function(slideEvt) {
   
        if(ButtonsState.RGB_BTN){
            self.setLayerOpacity('ndvi', 0);
            self.setLayerOpacity('ndwi', 0);
            self.setLayerOpacity('var_bio', 0);
            self.setLayerOpacity('WaterNeed', 0);
            self.setLayerOpacity('rgb', slideEvt.value);
        }else if(ButtonsState.Biomass_BTN){
            self.setLayerOpacity('rgb', 0);
            self.setLayerOpacity('ndwi', 0);
            self.setLayerOpacity('var_bio', 0);
            self.setLayerOpacity('WaterNeed', 0);
            self.setLayerOpacity('ndvi', slideEvt.value);
        }
        else if(ButtonsState.Moisture_BTN){
            self.setLayerOpacity('rgb', 0);
            self.setLayerOpacity('ndvi', 0);
            self.setLayerOpacity('var_bio', 0);
            self.setLayerOpacity('WaterNeed', 0);
            self.setLayerOpacity('ndwi', slideEvt.value);
        }
        else if(ButtonsState.B_Var_BTN){
            self.setLayerOpacity('rgb', 0);
            self.setLayerOpacity('ndvi', 0);
            self.setLayerOpacity('ndwi', 0);
            self.setLayerOpacity('WaterNeed', 0);
            self.setLayerOpacity('var_bio', slideEvt.value);
        }
        else if(ButtonsState.WaterNeed_BTN){
            self.setLayerOpacity('rgb', 0);
            self.setLayerOpacity('ndvi', 0);
            self.setLayerOpacity('ndwi', 0);
            self.setLayerOpacity('WaterNeed', slideEvt.value);
            self.setLayerOpacity('var_bio', 0);
        }
    });
    $('#biomassControl').on("slideStop", function(slideEvt) {
   
       if(ButtonsState.RGB_BTN){
            self.setLayerOpacity('ndvi', 0);
            self.setLayerOpacity('ndwi', 0);
            self.setLayerOpacity('var_bio', 0);
            self.setLayerOpacity('WaterNeed', 0);
            self.setLayerOpacity('rgb', slideEvt.value);
            
        }else if(ButtonsState.Biomass_BTN){
            self.setLayerOpacity('rgb', 0);
            self.setLayerOpacity('ndwi', 0);
            self.setLayerOpacity('var_bio', 0);
            self.setLayerOpacity('WaterNeed', 0);
            self.setLayerOpacity('ndvi', slideEvt.value);
        }else if(ButtonsState.Moisture_BTN){
            self.setLayerOpacity('rgb', 0);
            self.setLayerOpacity('ndvi', 0);
            self.setLayerOpacity('var_bio', 0);
            self.setLayerOpacity('WaterNeed', 0);
            self.setLayerOpacity('ndwi', slideEvt.value);
        }
        else if(ButtonsState.B_Var_BTN){
            self.setLayerOpacity('rgb', 0);
            self.setLayerOpacity('ndvi', 0);
            self.setLayerOpacity('ndwi', 0);
            self.setLayerOpacity('WaterNeed', 0);
            self.setLayerOpacity('var_bio', slideEvt.value);
        }else if(ButtonsState.WaterNeed_BTN){
            self.setLayerOpacity('rgb', 0);
            self.setLayerOpacity('ndvi', 0);
            self.setLayerOpacity('ndwi', 0);
            self.setLayerOpacity('WaterNeed', slideEvt.value);
            self.setLayerOpacity('var_bio', 0);
        }
    });
    
};

planet.App.prototype.opacity = function(self) {
    opacity = self;
};


/**
 * Alerts
 */

planet.App.prototype.showLoadingAlert = function(name) {
	$(".loader").show();
}

planet.App.prototype.removeLoadingAlert = function(name) {
	$(".loader").hide();
}

//style EPIC or MODIS
planet.App.prototype.getDate = function(days,style){
    var currentdate = new Date((new Date()).valueOf() - 1000*60*60*24*days);
	 
	 var dd = currentdate.getDate();
	 var mm = currentdate.getMonth()+1; //January is 0!
	 var yyyy = currentdate.getFullYear();
	 
	 if(dd<10) { dd='0'+dd }
	 if(mm<10) { mm='0'+mm } 
    
	 var datetime;
	 if(style == 'EPIC'){
    	datetime = yyyy + '/' + mm + '/' + dd;
	 }else if(style == 'MODIS'){
		datetime = yyyy + '-' + mm + '-' + dd;
	 } else{
		console.log("Wrong style");
	 } 
    
    return datetime;
 }

planet.App.prototype.iterateoverData = function(self,btn1,btn2)
{
    //past image    
    $(btn1).click(function(e){
        index = index-1;
        if(index>=0){
            
            self.lookupVariance(self,index);
            self.lookupRGB(self,index);
            self.lookupNDVI(self,index);
            self.lookupNDWI(self,index);

        }else{
            index = 0;
        }
    });
    //next image
     $(btn2).click(function(e){
        index = index+1;
       //  debugger
        if(index<collectionSize){
      
            self.lookupVariance(self,index);
            self.lookupRGB(self,index);
            self.lookupNDVI(self,index);
            self.lookupNDWI(self,index);

        }else{
            index = collectionSize;
        }
    });   
}
    
///////////////////////////////////////////////////////////////////////////////
//                           Region selection.                               //
///////////////////////////////////////////////////////////////////////////////


/** Initializes the region picker. */
planet.App.prototype.initRegionPicker = function() {
  // Respond when the user chooses to draw a polygon.
  $('#mark').click(this.setDrawingModeEnabled.bind(this, true));

  // Respond when the user draws a polygon on the map.
  google.maps.event.addListener(
      this._drawingManager, 'overlaycomplete',
      (function(event) {
        if (this.getDrawingModeEnabled()) {
          this.handleNewPolygon(event.overlay);
        } else {
          event.overlay.setMap(null);
        }
      }).bind(this));

  // Cancel drawing mode if the user presses escape.
  $(document).keydown((function(event) {
    if (event.which == 27) this.setDrawingModeEnabled(false);
  }).bind(this));

  // Respond when the user cancels polygon drawing.
  $('#clean-button').click(this.setDrawingModeEnabled.bind(this, false));

  // Respond when the user clears the polygon.
  $('#clean-button').click(this.clearPolygon.bind(this));
};


/**
 * Returns the coordinates of the currently drawn polygon.
 * @return {Array<Array<number>>} A list of coordinates describing
 *     the currently drawn polygon (or null if no polygon is drawn).
 */
planet.App.prototype.getPolygonCoordinates = function() {
  var points = this.currentPolygon.getPath().getArray();
  var twoDimensionalArray = points.map(function(point) {
    return [point.lng(), point.lat()];
  });
  return twoDimensionalArray;
};


/**
 * Sets whether drawing on the map is enabled.
 * @param {boolean} enabled Whether drawing mode is enabled.
 */
planet.App.prototype.setDrawingModeEnabled = function(enabled) {
  $('#mark').toggleClass('drawing', enabled);
  var mode = enabled ? google.maps.drawing.OverlayType.POLYGON : null;
  this._drawingManager.setOptions({drawingMode: mode});
};


/**
 * Sets whether drawing on the map is enabled.
 * @return {boolean} Whether drawing mode is enabled.
 */
planet.App.prototype.getDrawingModeEnabled = function() {
  return $('#mark').hasClass('drawing');
};


/** Clears the current polygon from the map and enables drawing. */
planet.App.prototype.clearPolygon = function() {
  this.currentPolygon.setMap(null);
  this.removeLayer('rgb');
  this.removeLayer('ndvi');
  this.removeLayer('ndwi');
  this.removeLayer('var_bio');
  this.removeLayer('WaterNeed');
  $('#mark').removeClass('selected');
};


/**
 * Stores the current polygon drawn on the map and disables drawing.
 * @param {Object} opt_overlay The new polygon drawn on the map. If
 *     undefined, the default polygon is treated as the new polygon.
 */
planet.App.prototype.handleNewPolygon = function(opt_overlay) {
  this.currentPolygon = opt_overlay;
  $('#mark').addClass('selected');
  this.setDrawingModeEnabled(false);
};

/**
 * click events for Index Buttons
 */

//all states are set to false except the parameter
planet.App.prototype.updateButtonsState = function(_button) {

    var obj = ButtonsState;
    
    for(var key in obj) {
        //console.log("Test :: " + key + " -- " + obj[key])
        if(key == _button){
            obj[key] = true;
        }else{
            obj[key] = false;
        }
    }
};

planet.App.prototype.initRGBButton = function(self, btn) {
    $(btn).click(function(e){
        
    	var background = document.getElementById('btn1').style.backgroundColor;
        if (background == "rgb(112, 128, 144)") {
            
            ButtonsState.RGB_BTN = true;
            ButtonsState.Biomass_BTN = false;
            ButtonsState.Moisture_BTN = false;
            ButtonsState.B_Var_BTN = false;
            ButtonsState.WaterNeed_BTN = false;
            
            self.showColorBar();
            self.showLogInfo();
           
            self.setLayerOpacity('rgb', +ButtonsState.RGB_BTN);
            //Mark others as disabled
            self.setLayerOpacity('ndvi', +ButtonsState.Biomass_BTN);
            self.setLayerOpacity('ndwi', +ButtonsState.Moisture_BTN);
            self.setLayerOpacity('var_bio', +ButtonsState.B_Var_BTN);
            self.setLayerOpacity('WaterNeed', +ButtonsState.WaterNeed_BTN);
            
            document.getElementById('btn1').style.background = "rgb(43, 173, 88)";
            document.getElementById('btn2').style.background = "rgb(112,128,144)";
            document.getElementById('btn3').style.background = "rgb(112,128,144)";
            document.getElementById('btn4').style.background = "rgb(112,128,144)";
            document.getElementById('btn5').style.background = "rgb(112,128,144)";
        } else {
          
            document.getElementById('btn1').style.background = "rgb(112,128,144)";
            ButtonsState.RGB_BTN = false;
            
            self.setLayerOpacity('rgb', +ButtonsState.RGB_BTN);
        }

    });
}

planet.App.prototype.initNDVIButton = function(self, btn) {
    $(btn).click(function(e){
  
        var background = document.getElementById('btn2').style.backgroundColor;
        if (background == "rgb(112, 128, 144)") {

            ButtonsState.Biomass_BTN = true;
            ButtonsState.RGB_BTN = false;
            ButtonsState.Moisture_BTN = false;
            ButtonsState.B_Var_BTN = false;
            ButtonsState.WaterNeed_BTN = false;
            
            self.showColorBar();
            self.showLogInfo();
            
            self.setLayerOpacity('rgb', +ButtonsState.RGB_BTN);
            self.setLayerOpacity('ndvi', +ButtonsState.Biomass_BTN);
            self.setLayerOpacity('ndwi', +ButtonsState.Moisture_BTN);
            self.setLayerOpacity('var_bio', +ButtonsState.B_Var_BTN);
            self.setLayerOpacity('WaterNeed', +ButtonsState.WaterNeed_BTN);
            
            document.getElementById('btn2').style.background = "rgb(43, 173, 88)";
            document.getElementById('btn3').style.background = "rgb(112, 128, 144)";
            document.getElementById('btn1').style.background = "rgb(112, 128, 144)";
            document.getElementById('btn4').style.background = "rgb(112,128,144)";
            document.getElementById('btn5').style.background = "rgb(112,128,144)";
        } else {

            document.getElementById('btn2').style.background = "rgb(112, 128, 144)";
            ButtonsState.Biomass_BTN = false;

            self.setLayerOpacity('ndvi', +ButtonsState.Biomass_BTN);
        }

    });
}
planet.App.prototype.initNDWIButton = function(self, btn) {
    $(btn).click(function(e){
        

        var background = document.getElementById('btn3').style.backgroundColor;
        if (background == "rgb(112, 128, 144)") {
            
            ButtonsState.Moisture_BTN = true;
            ButtonsState.Biomass_BTN = false;
            ButtonsState.RGB_BTN = false;
            ButtonsState.B_Var_BTN = false;
            ButtonsState.WaterNeed_BTN = false;
            
            self.showColorBar();
            self.showLogInfo();
            
            self.setLayerOpacity('rgb', +ButtonsState.RGB_BTN);
            self.setLayerOpacity('ndvi', +ButtonsState.Biomass_BTN);
            self.setLayerOpacity('ndwi', +ButtonsState.Moisture_BTN);
            self.setLayerOpacity('var_bio', +ButtonsState.B_Var_BTN);
            self.setLayerOpacity('WaterNeed', +ButtonsState.WaterNeed_BTN);
            
            document.getElementById('btn3').style.background = "rgb(43, 173, 88)";
            document.getElementById('btn1').style.background = "rgb(112, 128, 144)";
            document.getElementById('btn2').style.background = "rgb(112, 128, 144)";
            document.getElementById('btn4').style.background = "rgb(112,128,144)";
            document.getElementById('btn5').style.background = "rgb(112,128,144)";
        } else {

            document.getElementById('btn3').style.background = "rgb(112, 128, 144)";
            ButtonsState.Moisture_BTN = false;

            self.setLayerOpacity('ndwi', +ButtonsState.Moisture_BTN);
        }

    });
}
planet.App.prototype.initVarBioButton = function(self, btn) {
    $(btn).click(function(e){
        
        var background = document.getElementById('btn4').style.backgroundColor;
        if (background == "rgb(112, 128, 144)") {
            
            ButtonsState.B_Var_BTN = true;
            ButtonsState.Moisture_BTN = false;
            ButtonsState.Biomass_BTN = false;
            ButtonsState.RGB_BTN = false;
            ButtonsState.WaterNeed_BTN = false;
            
            self.showColorBar();
            self.showLogInfo();
            
            self.setLayerOpacity('rgb', +ButtonsState.RGB_BTN);
            self.setLayerOpacity('ndvi', +ButtonsState.Biomass_BTN);
            self.setLayerOpacity('ndwi', +ButtonsState.Moisture_BTN);
            self.setLayerOpacity('var_bio', +ButtonsState.B_Var_BTN);
            self.setLayerOpacity('WaterNeed', +ButtonsState.WaterNeed_BTN);
            
            document.getElementById('btn4').style.background = "rgb(43, 173, 88)";
            document.getElementById('btn1').style.background = "rgb(112, 128, 144)";
            document.getElementById('btn2').style.background = "rgb(112, 128, 144)";
            document.getElementById('btn3').style.background = "rgb(112,128,144)";
            document.getElementById('btn5').style.background = "rgb(112,128,144)";

        } else {

            document.getElementById('btn4').style.background = "rgb(112, 128, 144)";
            ButtonsState.B_Var_BTN = false;

            self.setLayerOpacity('var_bio', +ButtonsState.B_Var_BTN);
        }
       
    });
}
planet.App.prototype.initWaterNeedButton = function(self, btn) {
    $(btn).click(function(e){
        
        var background = document.getElementById('btn5').style.backgroundColor;
        if (background == "rgb(112, 128, 144)") {

            
            ButtonsState.B_Var_BTN = false;
            ButtonsState.Moisture_BTN = false;
            ButtonsState.Biomass_BTN = false;
            ButtonsState.RGB_BTN = false;
            ButtonsState.WaterNeed_BTN = true;
            
            self.showColorBar();
            self.showWaterInfo();
        
            self.setLayerOpacity('rgb', +ButtonsState.RGB_BTN);
            self.setLayerOpacity('ndvi', +ButtonsState.Biomass_BTN);
            self.setLayerOpacity('ndwi', +ButtonsState.Moisture_BTN);
            self.setLayerOpacity('var_bio', +ButtonsState.B_Var_BTN);
            self.setLayerOpacity('WaterNeed', +ButtonsState.WaterNeed_BTN);
            
            document.getElementById('btn1').style.background = "rgb(112, 128, 144)";
            document.getElementById('btn2').style.background = "rgb(112, 128, 144)";
            document.getElementById('btn3').style.background = "rgb(112, 128, 144)";
            document.getElementById('btn4').style.background = "rgb(112, 128, 144)";
            document.getElementById('btn5').style.background = "rgb(43, 173, 88)";
            

        } else {
        	
            document.getElementById('btn5').style.background = "rgb(112, 128, 144)";
            ButtonsState.WaterNeed_BTN = false;

            self.setLayerOpacity('WaterNeed', +ButtonsState.WaterNeed_BTN);
        }
       
    });
}

var createSnackbar = (function() {
	  // Any snackbar that is already shown
	  var previous = null;
	  
	  return function(message, actionText, action) {
	    if (previous) {
	      previous.dismiss();
	    }
	    var snackbar = document.createElement('div');
	    snackbar.className = 'paper-snackbar';
	    snackbar.dismiss = function() {
	      this.style.opacity = 0;
	    };
	    var text = document.createTextNode(message);
	    snackbar.appendChild(text);
	    if (actionText) {
	      if (!action) {
	        action = snackbar.dismiss.bind(snackbar);
	      }
	      var actionButton = document.createElement('button');
	      actionButton.className = 'action';
	      actionButton.innerHTML = actionText;
	      actionButton.addEventListener('click', action);
	      snackbar.appendChild(actionButton);
	    }
	    setTimeout(function() {
	      if (previous === this) {
	        previous.dismiss();
	      }
	    }.bind(snackbar), 8000);
	    
	    snackbar.addEventListener('transitionend', function(event, elapsed) {
	      if (event.propertyName === 'opacity' && this.style.opacity == 0) {
	        this.parentElement.removeChild(this);
	        if (previous === this) {
	          previous = null;
	        }
	      }
	    }.bind(snackbar));

	    
	    
	    previous = snackbar;
	    document.body.appendChild(snackbar);
	    // In order for the animations to trigger, I have to force the original style to be computed, and then change it.
	    getComputedStyle(snackbar).bottom;
	    snackbar.style.bottom = '0px';
	    snackbar.style.opacity = 1;
	  };
	})();

planet.App.prototype.showColorBar = function() {

       
	if( ButtonsState.RGB_BTN){
		$(".barwater").hide();
	    $(".barndvi").hide();
	    $(".barmoisture").hide();
	    $(".barvar").hide();
		
	}else if(ButtonsState.Biomass_BTN){
		$(".barwater").hide();
	    $(".barndvi").show();
	    $(".barmoisture").hide();
	    $(".barvar").hide();
		
	}else if(ButtonsState.Moisture_BTN){
		$(".barwater").hide();
	    $(".barndvi").hide();
	    $(".barmoisture").show();
	    $(".barvar").hide();
		
	}else if(ButtonsState.B_Var_BTN){
		$(".barwater").hide();
	    $(".barndvi").hide();
	    $(".barmoisture").hide();
	    $(".barvar").show();
		
	}else if(ButtonsState.WaterNeed_BTN){
		$(".barwater").show();
	    $(".barndvi").hide();
	    $(".barmoisture").hide();
	    $(".barvar").hide();
		
	}else{
		print("No state defined")
	}

	
}