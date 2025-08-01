/*
VegIndX 1.0 — Vegetation Index Calculator for Google Earth Engine
Copyright (c) 2025 Dr. Emre Akturk

Permission is hereby granted, free of charge, to any person obtaining a copy of this software
and associated documentation files (the “Software”), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


//ROI SELECTION

var gaulLevel1 = ee.FeatureCollection("FAO/GAUL/2015/level1");
var gaulLevel2 = ee.FeatureCollection("FAO/GAUL/2015/level2");

function getDistinctSortedNames(featureCollection, propertyName) {
  return featureCollection.aggregate_array(propertyName)
    .distinct()  
    .sort()      
    .getInfo();  
}

var panel = ui.Panel({style: {width: '400px'}});

var licenseNote = ui.Label(
  '© 2025 Dr. Emre Akturk — MIT License',
  {fontSize: '10px', color: '#6b7280'}
);
panel.add(licenseNote);


var appTitle = ui.Label('VegIndX 1.0', {
  fontWeight: 'bold',
  fontSize: '18px',
  color: '#1f2937'
});

var appSubtitle = ui.Label(
  'Compute and visualize multiple vegetation indices (NDVI, EVI, SAVI, etc.) in Google Earth Engine using Landsat 8. Select a country/province ROI, set dates, preview RGB, and export results to Drive.',
  {fontSize: '12px', color: '#4b5563'}
);


var appDivider = ui.Panel(null, null, {height: '1px', backgroundColor: '#e5e7eb', margin: '8px 0'});

panel.add(appTitle).add(appSubtitle).add(appDivider);



var scaleLabel = ui.Label('ROI Selection (Select Country or Province Scale)');
panel.add(scaleLabel);
var scaleSelector = ui.Select({
  items: ['Country', 'Province'],
  onChange: updateDropdownVisibility
});
panel.add(scaleSelector);

var countryLabel = ui.Label('Select a Country');
var countryList = getDistinctSortedNames(gaulLevel1, 'ADM0_NAME');
var countrySelector = ui.Select({
  items: countryList,
  onChange: function() {
    if(scaleSelector.getValue() === 'Country') {
      updateMap(countrySelector.getValue(), null);
    } else {
      updateProvinceDropdown(countrySelector.getValue());
    }
  }
});
panel.add(countryLabel).add(countrySelector);

var provinceLabel = ui.Label('Select a Province');
var provinceSelector = ui.Select({
  items: [],
  onChange: function() {
    updateMap(countrySelector.getValue(), provinceSelector.getValue());
  }
});
panel.add(provinceLabel).add(provinceSelector);

ui.root.add(panel);

function updateProvinceDropdown(selectedCountry) {
  var provinces = gaulLevel2.filter(ee.Filter.eq('ADM0_NAME', selectedCountry));
  var provinceList = getDistinctSortedNames(provinces, 'ADM1_NAME');
  provinceSelector.items().reset(provinceList);
  provinceSelector.setValue(provinceList[0], false);
}

function updateMap(selectedCountry, selectedProvince) {
  var geometry;
  if(selectedProvince) {
    geometry = gaulLevel2.filter(ee.Filter.eq('ADM1_NAME', selectedProvince));
  } else {
    geometry = gaulLevel1.filter(ee.Filter.eq('ADM0_NAME', selectedCountry));
  }
  Map.clear();
  Map.addLayer(geometry, {color: 'red'}, 'ROI');
  Map.centerObject(geometry, 7);
}

function updateDropdownVisibility() {
  var scale = scaleSelector.getValue();
  countryLabel.style().set('shown', true);
  countrySelector.style().set('shown', true);
  provinceLabel.style().set('shown', scale === 'Province');
  provinceSelector.style().set('shown', scale === 'Province');
}

updateDropdownVisibility();

updateMap(countrySelector.getValue(), null);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

// LANDSAT COLLECTION

var dateLabel = ui.Label('Select Date Range for Landsat 8 Collection (After March 2013)');
panel.add(dateLabel);

var startDatePicker = ui.Textbox({
  placeholder: 'Start Date (YYYY-MM-DD)',
  style: {width: '250px'}
});
panel.add(startDatePicker);

var endDatePicker = ui.Textbox({
  placeholder: 'End Date (YYYY-MM-DD)',
  style: {width: '250px'}
});
panel.add(endDatePicker);

function loadAndDisplayLandsat(start, end, roiGeometry) {
  if (start && end && roiGeometry) {
    var landsat = ee.ImageCollection("LANDSAT/LC08/C02/T1")
      .filterDate(start, end)
      .filterBounds(roiGeometry);

    var composite = ee.Algorithms.Landsat.simpleComposite({
      collection: landsat,
      asFloat: true
    }).clip(roiGeometry);

    Map.addLayer(composite, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.25}, 'ROI Landsat 8 RGB');
  } else {
    print('Please select both date range and ROI.');
  }
}

var applyButton = ui.Button({
  label: 'Load & Monitor RGB Landsat Imagery',
  onClick: function() {
    var start = startDatePicker.getValue();
    var end = endDatePicker.getValue();
    var roiGeometry = getSelectedGeometry();
    loadAndDisplayLandsat(start, end, roiGeometry);
  }
});
panel.add(applyButton);

function getSelectedGeometry() {
  var scale = scaleSelector.getValue();
  if (scale === 'Country') {
    return gaulLevel1.filter(ee.Filter.eq('ADM0_NAME', countrySelector.getValue())).geometry();
  } else if (scale === 'Province') {
    return gaulLevel2.filter(ee.Filter.eq('ADM1_NAME', provinceSelector.getValue())).geometry();
  }
  return null;
}

updateDropdownVisibility();

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

// VEGETATION INDICES

var viLabel = ui.Label('Select Desired Vegetation Indice');
panel.add(viLabel);

var viSelector = ui.Select({
  items: ['NDVI', 'DVI', 'EVI','GEMI','GARI','GCI','GDVI','GLI','GNDVI','GOSAVI','GRVI','GSAVI','GVI',
  'IPVI','MNLI','MSAVI2','MSR','NLI','OSAVI','RDVI','SAVI','SR','TDVI','VARI','WDRVI'], 
  onChange: calculateAndDisplayIndex
});
panel.add(viSelector);

function calculateAndDisplayIndex(selectedIndex) {
  var roiGeometry = getSelectedGeometry();
  if (!roiGeometry) {
    print('Please select an ROI.');
    return;
  }

  var start = startDatePicker.getValue();
  var end = endDatePicker.getValue();
  var landsat = ee.ImageCollection("LANDSAT/LC08/C02/T1")
    .filterDate(start, end)
    .filterBounds(roiGeometry);

  var composite = ee.Algorithms.Landsat.simpleComposite({
    collection: landsat,
    asFloat: true
  }).clip(roiGeometry);

  var indexImage;
  var visParams;
  switch (selectedIndex) {
    case 'NDVI':
      indexImage = composite.normalizedDifference(['B5', 'B4']);
      visParams = {min: -1, max: 1, palette: ['black','yellow','green']};
      break;
    case 'DVI':
      indexImage = composite.expression('(b5 - b4)', {
        'b5': composite.select('B5'),
        'b4': composite.select('B4')
      });
      visParams = {min: 0, max: 1, palette: ['black','yellow','green']};
      break;
    case 'EVI':
      indexImage = composite.expression('2.5 * ((b5 - b4) / (b5 + 6 * b4 - 7.5 * b2 + 1))', {
        'b5': composite.select('B5'),
        'b4': composite.select('B4'),
        'b2': composite.select('B2')
      });
      visParams = {palette: ['black','yellow','green']};
      break;
    case 'GEMI':
      indexImage = composite.expression('((2*((b5*b5)-(b4*b4)))+1.5*b5+0.5*b4)/(b5+b4+0.5)', {
        'b5': composite.select('B5'),
        'b4': composite.select('B4'),
        'b3': composite.select ('B3'),
        'b2': composite.select('B2')
      });
      visParams = {palette: ['black','yellow','green']};
      break;      
    case 'GARI':
      indexImage = composite.expression('(b5-(b3-1.7*(b2-b4)))/(b5+(b3-1.7*(b2-b4)))', {
        'b5': composite.select('B5'),
        'b4': composite.select('B4'),
        'b3': composite.select ('B3'),
        'b2': composite.select('B2')
      });
      visParams = {palette: ['black','yellow','green']};
      break;       
    case 'GCI':
      indexImage = composite.expression('(b5/b3)-1', {
        'b5': composite.select('B5'),
        'b3': composite.select ('B3')
      });
      visParams = {palette: ['black','yellow','green']};
      break;     
    case 'GDVI':
      indexImage = composite.expression('b5-b3', {
        'b5': composite.select('B5'),
        'b3': composite.select ('B3')
      });
      visParams = {palette: ['black','yellow','green']};
      break;         
    case 'GLI':
      indexImage = composite.expression('((b3-b4)+(b3-b2))/((2*b3)+b4+b2)', {
        'b4': composite.select('B4'),
        'b3': composite.select ('B3'),
        'b2': composite.select('B2')    
      });
      visParams = {palette: ['black','yellow','green']};
      break;      
    case 'GNDVI':
      indexImage = composite.expression('(b5-b3)/(b5+b3)', {
        'b5': composite.select('B5'),
        'b3': composite.select ('B3')
      });
      visParams = {palette: ['black','yellow','green']};
      break;       
    case 'GOSAVI':
      indexImage = composite.expression('(b5-b3)/(b5+b3+0.16)', {
        'b5': composite.select('B5'),
        'b3': composite.select ('B3')
      });
      visParams = {palette: ['black','yellow','green']};
      break;    
    case 'GRVI':
      indexImage = composite.expression('b5/b3', {
        'b5': composite.select('B5'),
        'b3': composite.select ('B3')
      });
      visParams = {palette: ['black','yellow','green']};
      break;    
    case 'GSAVI':
      indexImage = composite.expression('1.5*((b5-b3)/(b5+b3+0.5))', {
        'b5': composite.select('B5'),
        'b3': composite.select ('B3')
      });
      visParams = {palette: ['black','yellow','green']};
      break;     
    case 'GVI':
      indexImage = composite.expression('(-0.2848*b2)+(-0.2435*b3)+(-0.5436*b4)+(0.7243*b5)+(0.0840*b6)+(-0.1800*b7)', {
        'b7': composite.select('B7'),
        'b6': composite.select('B6'),
        'b5': composite.select('B5'),
        'b4': composite.select('B4'),
        'b3': composite.select ('B3'),
        'b2': composite.select('B2')
      });
      visParams = {palette: ['black','yellow','green']};
      break;      
    case 'IPVI':
      indexImage = composite.expression('b5/(b5-b4)', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });
      visParams = {palette: ['black','yellow','green']};
      break;       
    case 'MNLI':
      indexImage = composite.expression('(((b5*b5)-b4)*(1+0.5))/((b5*b5)+b4+0.5)', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });
      visParams = {palette: ['black','yellow','green']};
      break;        
     case 'MSAVI2':
      indexImage = composite.expression('(2 * b5 + 1 - sqrt(pow((2 * b5 + 1), 2) - 8 * (b5 - b4)) ) / 2', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });
      visParams = {palette: ['black','yellow','green']};
      break;    
     case 'MSR':
      indexImage = composite.expression('((b5/b4)-1)/((sqrt(b5/b4))+1)', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });
      visParams = {palette: ['black','yellow','green']};
      break;        
     case 'NLI':
      indexImage = composite.expression('((b5*b5)-b4)/((b5*b5)+b4)', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });
      visParams = {palette: ['black','yellow','green']};
      break;      
     case 'OSAVI':
      indexImage = composite.expression('(b5-b4)/(b5+b4+0.16)', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });
      visParams = {palette: ['black','yellow','green']};
      break;      
     case 'RDVI':
      indexImage = composite.expression('(b5-b4)/(sqrt(b5+b4))', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });
      visParams = {palette: ['black','yellow','green']};
      break;      
     case 'SAVI':
      indexImage = composite.expression('(1.5*(b5-b4))/(b5+b4+0.5)', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });
      visParams = {palette: ['black','yellow','green']};
      break;        
     case 'SR':
      indexImage = composite.expression('b5/b4', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });
      visParams = {palette: ['black','yellow','green']};
      break;              
     case 'TDVI':
      indexImage = composite.expression('1.5*((b5-b4)/(sqrt((b5*b5)+b4+0.5)))', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });
      visParams = {palette: ['black','yellow','green']};
      break;       
     case 'VARI':
      indexImage = composite.expression('(b3-b4)/(b3+b4-b2)', {
        'b4': composite.select('B4'),
        'b3': composite.select ('B3'),
        'b2': composite.select ('B2')
      });
      visParams = {palette: ['black','yellow','green']};
      break;       
     case 'WDRVI':
      indexImage = composite.expression('(0.2*(b5-b4))/(0.2*(b5+b4))', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });
      visParams = {palette: ['black','yellow','green']};
      break;
      
    default:
      print('Select a vegetation indice.');
      return;
  }   

  Map.addLayer(indexImage, visParams, selectedIndex);

  addLegend(selectedIndex, visParams.palette);
}

function addLegend(title, palette) {}

updateDropdownVisibility();
updateMap(countrySelector.getValue(), null);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

// EXPORT

var exportButton = ui.Button({
  label: 'Export Selected Vegetation Indice to Drive',
  onClick: function() {
    exportIndexImage();
  }
});
panel.add(exportButton);

function exportIndexImage() {
  var roiGeometry = getSelectedGeometry();
  if (!roiGeometry) {
    print('Please select an ROI before exporting.');
    return;
  }

  var selectedIndex = viSelector.getValue();
  if (!selectedIndex) {
    print('Please select a vegetation index before exporting.');
    return;
  }

  var start = startDatePicker.getValue();
  var end = endDatePicker.getValue();
  var landsat = ee.ImageCollection("LANDSAT/LC08/C02/T1")
    .filterDate(start, end)
    .filterBounds(roiGeometry);

  var composite = ee.Algorithms.Landsat.simpleComposite({
    collection: landsat,
    asFloat: true
  }).clip(roiGeometry);
  
    var indexImage = calculateIndexImage(selectedIndex, composite); 

  Export.image.toDrive({
    image: indexImage,
    description: 'Exported_' + selectedIndex,
    scale: 30,
    region: roiGeometry,
    fileFormat: 'GeoTIFF',
    folder: 'GEE_Export',
    maxPixels: 1e9
  });
  
  print('Export initiated for ' + selectedIndex + '. Check your Google Drive after a few minutes.');
}

function calculateIndexImage(selectedIndex, composite) {
  switch (selectedIndex) {
    case 'NDVI':
      return composite.normalizedDifference(['B5', 'B4']);
    case 'DVI':
      return composite.expression('(b5 - b4)', {
        'b5': composite.select('B5'),
        'b4': composite.select('B4')
      });
    case 'EVI':
      return composite.expression('2.5 * ((b5 - b4) / (b5 + 6 * b4 - 7.5 * b2 + 1))', {
        'b5': composite.select('B5'),
        'b4': composite.select('B4'),
        'b2': composite.select('B2')
      });   
    case 'GEMI':
      return composite.composite.expression('((2*((b5*b5)-(b4*b4)))+1.5*b5+0.5*b4)/(b5+b4+0.5)', {
        'b5': composite.select('B5'),
        'b4': composite.select('B4'),
        'b3': composite.select ('B3'),
        'b2': composite.select('B2')
      });
    case 'GARI':
      return composite.expression('(b5-(b3-1.7*(b2-b4)))/(b5+(b3-1.7*(b2-b4)))', {
        'b5': composite.select('B5'),
        'b4': composite.select('B4'),
        'b3': composite.select ('B3'),
        'b2': composite.select('B2')
      });
    case 'GCI':
      return composite.expression('(b5/b3)-1', {
        'b5': composite.select('B5'),
        'b3': composite.select ('B3')
      });
    case 'GDVI':
      return composite.expression('b5-b3', {
        'b5': composite.select('B5'),
        'b3': composite.select ('B3')
      });
    case 'GLI':
      return composite.expression('((b3-b4)+(b3-b2))/((2*b3)+b4+b2)', {
        'b4': composite.select('B4'),
        'b3': composite.select ('B3'),
        'b2': composite.select('B2')    
      });
    case 'GNDVI':
      return composite.expression('(b5-b3)/(b5+b3)', {
        'b5': composite.select('B5'),
        'b3': composite.select ('B3')
      });
    case 'GOSAVI':
      return composite.expression('(b5-b3)/(b5+b3+0.16)', {
        'b5': composite.select('B5'),
        'b3': composite.select ('B3')
      });
    case 'GRVI':
      return composite.expression('b5/b3', {
        'b5': composite.select('B5'),
        'b3': composite.select ('B3')
      });
    case 'GSAVI':
      return composite.expression('1.5*((b5-b3)/(b5+b3+0.5))', {
        'b5': composite.select('B5'),
        'b3': composite.select ('B3')
      });
    case 'GVI':
      return composite.expression('(-0.2848*b2)+(-0.2435*b3)+(-0.5436*b4)+(0.7243*b5)+(0.0840*b6)+(-0.1800*b7)', {
        'b7': composite.select('B7'),
        'b6': composite.select('B6'),
        'b5': composite.select('B5'),
        'b4': composite.select('B4'),
        'b3': composite.select ('B3'),
        'b2': composite.select('B2')
      });
    case 'IPVI':
      return composite.expression('b5/(b5-b4)', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });
    case 'MNLI':
      return composite.expression('(((b5*b5)-b4)*(1+0.5))/((b5*b5)+b4+0.5)', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      }); 
    case 'MSAVI2':
      return composite.expression('(2 * b5 + 1 - sqrt(pow((2 * b5 + 1), 2) - 8 * (b5 - b4)) ) / 2', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });  
    case 'MSR':
      return composite.expression('((b5/b4)-1)/((sqrt(b5/b4))+1)', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });  
    case 'NLI':
      return composite.expression('((b5*b5)-b4)/((b5*b5)+b4)', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });
    case 'OSAVI':
      return composite.expression('(b5-b4)/(b5+b4+0.16)', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });   
    case 'RDVI':
      return composite.expression('(b5-b4)/(sqrt(b5+b4))', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });   
    case 'SAVI':
      return composite.expression('(1.5*(b5-b4))/(b5+b4+0.5)', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });       
    case 'SR':
      return composite.expression('b5/b4', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });   
    case 'TDVI':
      return composite.expression('1.5*((b5-b4)/(sqrt((b5*b5)+b4+0.5)))', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });
    case 'VARI':
      return composite.expression('(b3-b4)/(b3+b4-b2)', {
        'b4': composite.select('B4'),
        'b3': composite.select ('B3'),
        'b2': composite.select ('B2')
      });          
    case 'WDRVI':
      return composite.expression('(0.2*(b5-b4))/(0.2*(b5+b4))', {
        'b5': composite.select('B5'),
        'b4': composite.select ('B4')
      });           
  }
}

