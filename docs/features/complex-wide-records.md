# 단지 전체 임장 기록

Approved: repeated visits with date, memo and photos; no dong/unit/price or property-condition fields. Access from the apartment map; display in existing home/recent and My records with the label 단지 전체.

Implementation: reuse the existing private record container and visits persistence. Reserved container ID `complex_<uuid>` identifies apartment-wide scope, avoiding a database migration or changes to RLS. Normal building IDs remain unchanged. Hide reserved containers from map markers, dong input suggestions and dong counts; retain them in a separate complex-record section. Creating a draft does not persist an empty container. First successful save creates the container, subsequent records reuse it. Edit/delete reuse existing record/photo handling. Compose URLs use `new=1&scope=complex`; saved records use the existing building/visit URL.

Validation: UI tests cover repeated save, omission of hidden property data, compose URL restore, edit/delete independence. Existing API/database tests exercise unchanged snapshot and owner storage paths. Independent review found no important issues. Live signed-in browser interactions were not verified.

## Compact assessment

Refined from the user's full checklist: six optional assessments (교통·접근성, 생활 편의, 단지 환경, 외관·관리, 주차·보안, 소음·쾌적성), each 좋음/보통/아쉬움. Context hints cover slopes/walking routes, shops/schools/parks, building spacing/landscaping, common areas/waste, parking/access control, and noise/odour/sunlight. Optional 40-character station/bus walking note. No default rating; tap again clears. Keep longer observations in memo and photos.

Existing details JSON stores cTransport/cInfra/cEnvironment/cManagement/cParking/cComfort/cWalk; no migration. Property form reads only property fields, complex form only complex fields. Saved cards include labelled assessments; details show every selected field. Existing memo-only records remain compatible.

## Record hierarchy
Apartment summary lists only real dong names, plus separate counts for complex records and dong/unit records. Inside an apartment, complex records appear in their own section above property records. Dong filters and price sorting apply only to property records. Existing saved records retain their IDs and URLs.
