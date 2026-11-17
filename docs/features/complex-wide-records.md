# 단지 전체 임장 기록

Approved: repeated visits with date, memo and photos; no dong/unit/price or property-condition fields. Access from the apartment map; display in existing home/recent and My records with the label 단지 전체.

Implementation: reuse the existing private record container and visits persistence. Reserved container ID `complex_<uuid>` identifies apartment-wide scope, avoiding a database migration or changes to RLS. Normal building IDs remain unchanged. Hide reserved containers from map markers, dong input suggestions and dong counts; retain them in record lists and record filters. Creating a draft does not persist an empty container. First successful save creates the container, subsequent records reuse it. Edit/delete reuse existing record/photo handling. Compose URLs use `new=1&scope=complex`; saved records use the existing building/visit URL.

Validation: UI tests cover repeated save, omission of hidden property data, compose URL restore, edit/delete independence. Existing API/database tests exercise unchanged snapshot and owner storage paths. Independent review found no important issues. Live signed-in browser interactions were not verified.
