const ee = require('@google/earthengine')
 
const mtci = (satellite, date, geometry, regions, response) => {
    var Sentinel = ee.ImageCollection('COPERNICUS/S2_SR')
        .filterDate(date[0], date[1])
        .filterBounds(geometry);

    var image = ee.Image(satellite);

    //MTCI = (B6 - B5)/(B5 - B4)
    var mtci = image.expression(
        '(B6 - B5)/(B5 - B4)', {
            'B6': image.select('B6'),
            'B5': image.select('B5'),
            'B4': image.select('B4')
        });
    //fonction pour calculer l'indice NDVI
    /*var addNDVI = function(image) {
    return image.addBands(image.normalizedDifference(['B5', 'B4']));
    };
    Sentinel = Sentinel.map(addNDVI);
    print(Sentinel);
    var NDVI = Sentinel.select(['nd']);
    var NDVImed = NDVI.median(); //I just changed the name of this variable ;)*/
    var vis = {
        min: 0,
        max: 1,
        palette: [
            'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
            '74A901', '66A000', '529400', '3E8601', '207401', '056201',
            '004C00', '023B01', '012E01', '011D01', '011301'
        ]
    };

    mtci.clip(geometry).getMap(vis, ({ mapid, token }) => {        
        response.render('index', { mapid, token})
    }); 
}

module.exports = mtci