
import maplibregl from 'maplibre-gl';
import { Deck } from '@deck.gl/core';
import { CartoLayer, MAP_TYPES, setDefaultCredentials } from '@deck.gl/carto';
import { EditableGeoJsonLayer } from "@nebula.gl/layers";
import { DrawPolygonMode } from "@nebula.gl/edit-modes";
import { countPointsInPolygonGeom, countPointsInPolygonQuadbin } from './pointInPolygon.js';

const INITIAL_VIEW_STATE = {
  latitude: 40.74647536820825,
  longitude: -73.99917720586467,
  zoom: 16,
  bearing: 0,
  pitch: 30
};

let editLayerData = {
  type: "FeatureCollection",
  features: []
}

let deck, accessToken;

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
        editLayerData = {
          type: "FeatureCollection",
          features: [geojsonFeature]
        };
        runPointInPolygon(geojsonFeature.geometry);

      } else {
        editLayerData = updatedData;
      }
      deck.setProps({ layers: getLayers() });
    }
  });
  return [editLayer];
}

function runPointInPolygon(polygon) {
  
  const start = new Date().getTime();

  const elGeom = document.getElementById('calculation_geom');
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

   deck = new Deck({
    canvas: 'deck-canvas',
    initialViewState: INITIAL_VIEW_STATE,
    controller: true,
    layers: [ getLayers() ]
      // new CartoLayer({
      //   connection: 'carto_dw',
      //   type: MAP_TYPES.TABLE,
      //   data: 'cartobq.public_account.populated_places',
      //   pointRadiusMinPixels: 2,
      //   getFillColor: [200, 0, 80]
      // })
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

