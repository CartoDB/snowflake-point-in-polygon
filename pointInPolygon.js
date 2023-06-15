
import bbox from '@turf/bbox';

const API_BASE_URL = "https://direct-gcp-us-east1.api.carto.com";
const RESOLUTION = 22;

export const CONNECTION = "sf-geospatial-tst";
const GEO_COLUMN = 'geog';
// const GEOM_TABLE = '"TMP_SB"."DATA"."CELL_TOWER_GEOG_CARTO_1B"';
// const QUADBIN_TABLE = '"TMP_SB"."DATA"."CELL_TOWER_GEOG_CARTO_1B_QDBN"';
const GEOM_TABLE = '"TMP_SB"."DATA"."CELL_TOWER_GEOG_CARTO_146B"';
const QUADBIN_TABLE = '"TMP_SB"."DATA"."CELL_TOWER_GEOG_CARTO_146B_QDBN"';

// export const CONNECTION = "carto-snowflake-demo";
// const GEOM_TABLE = '"CARTO_SNOWFLAKE_DEMO"."ATT"."SAMPLE_POINT_1B"'
// const QUADBIN_TABLE = '"CARTO_SNOWFLAKE_DEMO"."ATT"."SAMPLE_POINT_1B_QUADBIN"'
// const GEO_COLUMN = 'geom'


async function executeQuery({query, accessToken}) {
  const url = `${API_BASE_URL}/v3/sql/${CONNECTION}/query?q=${encodeURI(query)}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    }
  });
  return await response.json();
}

export async function countPointsInPolygonGeom({polygon, accessToken}) {
  const query = `
    SELECT count(*) as n 
      FROM ${GEOM_TABLE}
    WHERE ST_Intersects(${GEO_COLUMN}, TO_GEOGRAPHY('${JSON.stringify(polygon)}'))
  `;
  const r = await executeQuery({ query, accessToken });
  return r.rows[0].N
}

export async function countPointsInPolygonQuadbin({polygon, accessToken}) {
  const query = `
    WITH source_geog AS (
        SELECT TO_GEOGRAPHY('${JSON.stringify(polygon)}') as geog
    ), low_quadbins AS (
        SELECT value::number as quadbin FROM 
        TABLE(FLATTEN(CARTO.CARTO.QUADBIN_POLYFILL((select geog from source_geog), ${RESOLUTION})))
    )
    SELECT count(*) as n
      FROM ${QUADBIN_TABLE}
      WHERE quadbin_22 IN ( select quadbin from low_quadbins)
  `;
  const r = await executeQuery({ query, accessToken });
  return r.rows[0].N
}

export async function countPointsInPolygonLatLng({polygon, accessToken}) {
  const bb = bbox(polygon); 
  const query = `
    SELECT count(*) as n 
      FROM ${GEOM_TABLE}
    WHERE 
      LATITUDE >= ${bb[1]} AND LATITUDE <= ${bb[3]} AND
      LONGITUDE >= ${bb[0]} AND LONGITUDE <= ${bb[2]} 
      AND
        ST_Within(${GEO_COLUMN}, TO_GEOGRAPHY('${JSON.stringify(polygon)}'))
  `;

  const r = await executeQuery({ query, accessToken });
  return r.rows[0].N
}

export function getLayerQuery(polygon) {
  return  `
    WITH source_geog AS (
        SELECT TO_GEOGRAPHY('${JSON.stringify(polygon)}') as geog
    ), low_quadbins AS (
        SELECT value::number as quadbin FROM 
        TABLE(FLATTEN(CARTO.CARTO.QUADBIN_POLYFILL((select geog from source_geog), ${RESOLUTION})))
    ), quadbins AS (
      SELECT quadbin_22
        FROM ${QUADBIN_TABLE}
        WHERE quadbin_22 IN ( select quadbin from low_quadbins)
    )
    SELECT ${GEO_COLUMN} as geom
      FROM ${GEOM_TABLE} a , quadbins
      WHERE a.quadbin_22 = quadbins.quadbin_22
      AND ST_Intersects(a.${GEO_COLUMN}, TO_GEOGRAPHY('${JSON.stringify(polygon)}'))
    `;
}
