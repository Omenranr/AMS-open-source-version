var express = require('express')
var router = express.Router()

//data imports
const region = require('../static/data/region.json')
const province = require('../static/data/province.json')
//functions imports
const ndvi = require('../functions/ndvi')
const landuse = require('../functions/landuse')
const mtci = require('../functions/mtci')
const chirps = require('../functions/chirps')
router.get('/', (request, response) => {

    response.render('index')
});

router.post('/getJson', (req, response) => { 
    const regions = region.features; 
    const provinces = province.features;
    const x = req.body.indicator;
    const hex = req.body.selectreg;
    var y = parseInt(hex, 16); 
    var z= req.body.selectprov;
    console.log('INDICATOR = ' + x + '  REGION= ' + y+ ' PROVINCE = '+z)
    //inputs 
    const satellite = 'COPERNICUS/S2'
    const date = ['2016-01-01', '2016-03-31']
    let reg;
    if(z == -1)
       reg = regions[y].geometry
    else
      reg = provinces[z].geometry
    // select province cod_reg => provine => col 
    //NDVI
    //console.log("q = "+ JSON.stringify(request.params))
    if (x == '1') {
        ndvi(satellite, date, reg, (mapid, token) => {
            response.json({ mapid: mapid, token: token})
        })
    }
    else if (x == '2') {
        landuse(reg, (mapid, token) => {
            response.json({ mapid: mapid, token: token})
        })
    }
    else if (x == '3') {
        mtci(reg, (mapid, token) => {
            response.json({ mapid: mapid, token: token})
        })
    }
    else if(x== '4'){
        landuse(reg, (mapid, token) => {
            response.json({ mapid: mapid, token: token})
        })
    }
    else{
        console.log('chirps')
        chirps(satellite, date, reg, (mapid, token) => {
            response.json({ mapid: mapid, token: token})
        })
    }


});



module.exports = router;