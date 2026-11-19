# Property pass marker

Optional visits.details.decision = 패스 marks a single dong/unit record as a passed property. Existing unmarked records remain unmarked. The form chip toggles the marker, detail view offers a direct action to set/clear it, lists show a pass badge. Clearing deletes only the decision key; all notes/details/photos remain. Complex-level entries do not expose this property action.

Uses existing scoped change/persist and revision conflict handling. Members may update the same shared record under current permissions. No migration: details is JSON. src/journal-validation.js accepts only 패스, and journal-workspace Edge must be redeployed before the app client writes the new value.
