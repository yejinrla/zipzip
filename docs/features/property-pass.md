# Property review status

Dong/unit records expose 검토 중, 후보, 제외 in the form and detail view. Missing decision means 검토 중; selecting it removes only visits.details.decision. Legacy 패스 values display as 제외 and remain accepted for compatibility. Notes, photos and other details are preserved. Apartment-wide records do not expose property review status.

The units list shows status badges and a 후보만 filter, combined with the selected dong and sorting. The candidates=1 URL parameter restores the filter after refresh. The filter is cleared on apartment navigation or switching to apartment-wide records.

Uses existing scoped change/persist and revision conflict handling, including collaborative workspaces. No schema migration is needed. src/journal-validation.js accepts the three statuses plus legacy 패스. Deploy journal-workspace Edge separately before publishing client changes.
