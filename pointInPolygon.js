
const API_BASE_URL = "https://direct-gcp-us-east1.api.carto.com";
const CONNECTION = "carto-snowflake-demo";
const RESOLUTION = 22;

async function executeQuery({query, accessToken}) {
  const url = `${API_BASE_URL}/v3/sql/${CONNECTION}/query?q=${query}`;
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
      FROM CARTO_SNOWFLAKE_DEMO.ATT.SAMPLE_POINT_1B
    WHERE ST_Intersects(geom, TO_GEOGRAPHY('${JSON.stringify(polygon)}'))
  `;
  // const r = await executeQuery({ query, accessToken });
  // return r.rows[0].N
  return 0
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
      FROM CARTO_SNOWFLAKE_DEMO.ATT.SAMPLE_POINT_1B_QUADBIN
      WHERE quadbin_22 IN ( select quadbin from low_quadbins)
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
        FROM CARTO_SNOWFLAKE_DEMO.ATT.SAMPLE_POINT_1B_QUADBIN
        WHERE quadbin_22 IN ( select quadbin from low_quadbins)
    )
    SELECT geom 
      FROM CARTO_SNOWFLAKE_DEMO.ATT.SAMPLE_POINT_1B a , quadbins
      WHERE a.quadbin_22 = quadbins.quadbin_22
    `;
}
