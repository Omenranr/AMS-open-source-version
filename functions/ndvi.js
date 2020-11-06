const ee = require('@google/earthengine')
// ndvi(satellite, date, tanger, (mapid, token, regions) => {
//     response.render('index', { mapid, token, regions })
//   })
const ndvi = (satellite, date, geometry, callback) => {
    function maskS2clouds(image) {
        const qa = image.select('QA60')

        // Bits 10 and 11 are clouds and cirrus, respectively.
        const cloudBitMask = 1 << 10
        const cirrusBitMask = 1 << 11

        // Both flags should be set to zero, indicating clear conditions.
        let mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(
            qa.bitwiseAnd(cirrusBitMask).eq(0))

        // Return the masked and scaled data, without the QA bands.
        return image.updateMask(mask).divide(10000)
            .select("B.*")
            .copyProperties(image, ["system:time_start"])
    }

    // Map the function over one year of data and take the median.
    // Load Sentinel-2 TOA reflectance data.
    let collection = ee.ImageCollection(satellite)
        .filterDate(date[0], date[1])
        // Pre-filter to get less cloudy granules.
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
        //.map(maskS2clouds)
        .filterBounds(geometry)

    let composite = collection.median()

    // Use the normalizedDifference(A, B) to compute (A - B) / (A + B)
    const ndvi = composite.normalizedDifference(['B8', 'B4'])

    // Make a palette: a list of hex strings.
    const palette = ['FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
        '74A901', '66A000', '529400', '3E8601', '207401', '056201',
        '004C00', '023B01', '012E01', '011D01', '011301']


    ndvi.clip(geometry).getMap({ min: 0, max: 1, palette: palette }, ({ mapid, token }) => {        
        callback(mapid, token)
    }); 
}

module.exports = ndvi