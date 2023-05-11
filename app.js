
import maplibregl from 'maplibre-gl';
import { Deck } from '@deck.gl/core';
import { CartoLayer, MAP_TYPES, setDefaultCredentials } from '@deck.gl/carto';
import { EditableGeoJsonLayer } from "@nebula.gl/layers";
import { DrawPolygonMode } from "@nebula.gl/edit-modes";
import { countPointsInPolygonGeom, countPointsInPolygonQuadbin, getLayerQuery } from './pointInPolygon.js';

const INITIAL_VIEW_STATE = {
  latitude: 40.74647536820825,
  longitude: -73.99917720586467,
  zoom: 16,
  bearing: 0,
  pitch: 30,
  minZoom: 14
};

let editLayerData = {
  type: "FeatureCollection",
  features: []
}

let deck, accessToken, currentPolygon;

function getLayers() {
  const editLayer = new EditableGeoJsonLayer({
    id: "nebula",
    data: editLayerData,
    selectedFeatureIndexes: [],
    mode: DrawPolygonMode,

    // Styles
    filled: true,
    pointRadiusMinPixels: 2,
    pointRadiusScale: 2000,
    // getElevation: 1000,
    getFillColor: [200, 0, 80, 180],

    // Interactive props
    pickable: true,
    autoHighlight: true,

    onEdit: ({ updatedData, editType, featureIndexes, editContext }) => {
     
      if (editType === "addFeature") {
        const geojsonFeature = updatedData.features[updatedData.features.length - 1];
        currentPolygon = geojsonFeature.geometry;
        editLayerData = {
          type: "FeatureCollection",
          features: [geojsonFeature]
        };
        console.log(getLayerQuery(currentPolygon))
        runPointInPolygon(currentPolygon);

      } else {
        editLayerData = updatedData;
      }
      deck.setProps({ layers: getLayers() });
    }
  });

  const intersectionLayer = currentPolygon && new CartoLayer({
    connection: 'carto-snowflake-demo',   
    type: MAP_TYPES.QUERY,
    data: getLayerQuery(currentPolygon),
    pointRadiusMinPixels: 4,
    getFillColor: [200, 0, 80]
  })

  return [editLayer, intersectionLayer];
}

function runPointInPolygon(polygon) {
  
  const start = new Date().getTime();

  const elGeom = document.getElementById('calculation_geom');
  // elGeom.innerHTML = 'Disabled';
  elGeom.innerHTML = 'Executing query...';
  countPointsInPolygonGeom({ polygon, accessToken }).then((count) => {
    const finish = new Date().getTime();
    const elapsedInSeconds = (finish - start) / 1000;
    elGeom.innerHTML = `Query executed in ${elapsedInSeconds} seconds. ${count} points found.`;
  })

  const elQuadbin = document.getElementById('calculation_quadbin');
  elQuadbin.innerHTML = 'Executing query...';
  countPointsInPolygonQuadbin({ polygon, accessToken }).then((count) => {
    const finish = new Date().getTime();
    const elapsedInSeconds = (finish - start) / 1000;
    elQuadbin.innerHTML = `Query executed in ${elapsedInSeconds} seconds. ${count} points found.`;
  })
}

export function initApp(pAccessToken) {

  accessToken = pAccessToken;

  setDefaultCredentials({accessToken})

   deck = new Deck({
    canvas: 'deck-canvas',
    initialViewState: INITIAL_VIEW_STATE,
    controller: true,
    layers: [ getLayers() ]
  })

  // Add basemap
  const MAP_STYLE ='https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
  const map = new maplibregl.Map({container: 'map', style: MAP_STYLE, interactive: false});
  deck.setProps({
    onViewStateChange: ({viewState}) => {
      const {longitude, latitude, ...rest} = viewState;
      map.jumpTo({center: [longitude, latitude], ...rest});
    }
  });
}

