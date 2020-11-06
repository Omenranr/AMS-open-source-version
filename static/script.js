/**
 * Initialize the Google Map and add our custom layer overlay.
 * @param  {string} mapId
 * @param  {string} token
 */
var map;
var mapType;

const initialize = () => {

  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 31.526955, lng: -6.346527 },
    zoom: 6,
    
  });

  var drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: google.maps.drawing.OverlayType.MARKER,
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_CENTER,
      drawingModes: ['marker', 'circle', 'polygon', 'polyline', 'rectangle']
    },
    markerOptions: { icon: 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png' },
    circleOptions: {
      fillColor: '#ffff00',
      fillOpacity: 1,
      strokeWeight: 5,
      clickable: false,
      editable: true,
      zIndex: 1
    }
  });

  drawingManager.setMap(map);
};

const addLayer = function (mapId, token) {
  const eeMapOptions = {
    getTileUrl: (tile, zoom) => {
     // console.log(mapId, token)
      const baseUrl = 'https://earthengine.googleapis.com/map';
      const url = [baseUrl, mapId, zoom, tile.x, tile.y].join('/');
      return `${url}?token=${token}`;
    },
    name: 'name1',
    tileSize: new google.maps.Size(256, 256)
  };

  mapType = new google.maps.ImageMapType(eeMapOptions);
  map.overlayMapTypes.removeAt(0);
  map.overlayMapTypes.push(mapType);
}
const removeLayer = function (index) {
  map.overlayMapTypes.removeAt(index);
}

function changeRegion() {
  var selectBox = document.getElementById("selectBox");
  var reg = selectBox.options[selectBox.selectedIndex].value;
  // console.log(reg)
  // alert(selectedValue);
  //var center = {lat : Number(reg.split(',')[0]), lng : Number(reg.split(',')[1])}

  var center = { lat: 35.428332, lng: -5.383017 }
  map.panTo(center)
  setTimeout(function () {
    map.setZoom(9)
  }, 1000);
  map.setZoom(6)
}


function changeProvince(region) {
  const rp = region.features[y].properties.Code_Regio
  let provinveSel = [];
  for (let i = 0; i < provinces.length; i++) {
    let prov = provinces[i]
    if (prov.properties.Code_Provi.substr(0, 3) === rp) {
      provinveSel.push(prov)
    }
  }
}

