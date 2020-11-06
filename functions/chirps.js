const ee = require('@google/earthengine')

const chirps = (satellite, date, geometry, callback) => {
 
var dataset = ee.ImageCollection(satellite) //'UCSB-CHG/CHIRPS/DAILY'
    .filter(ee.Filter.date(date[0], date[1]))
    .filterBounds(geometry)

let composite = dataset.median()
const chirps= composite.normalizedDifference(['B8', 'B4'])

var precipitationVis = {
    min: 1.0,
    max: 17.0,
    palette: ['001137', '0aab1e', 'e7eb05', 'ff4a2d', 'e90000'],
};

chirps.clip(geometry).getMap(precipitation ,precipitationVis, ({ mapid, token }) => {
    callback(mapid, token)
});
}

module.exports = chirps