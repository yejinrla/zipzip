# Automatic apartment dong selection

User approved external building footprints and dong names over the Naver map, after learning native base-map labels are not exposed as application building objects. Preserve mobile layout and existing confirmation/record page.

Use VWorld 2D Data API LT_C_SPBD (road-address buildings), exact normalized building-name matching within a bounded neighborhood. Only records with detailed building names and valid Polygon/MultiPolygon coordinates become selectable. Do not infer dong numbers or register neighboring apartments. Existing personal buildings remain available.

Alternatives: manual pins already exist but do not meet automatic selection; Naver base-map labels provide no supported building metadata for this flow. GIS building/register joins require additional datasets and credentials. Chosen approach uses one VWorld key and acknowledges missing or mismatched source names.

Server API verifies the complex is owned by the logged-in user, keeps provider key server-side, and returns sanitized footprints. Client draws polygons and accessible labels. Confirm Proceed saves a minimal personal building and opens record page; Cancel saves nothing. Match existing dong by ID/name to retain records. Ignore stale data after navigation. Show missing key, empty results and retry states.

Live provider verification requires owner-issued VWORLD_API_KEY; do not claim actual apartment coverage before that check.
