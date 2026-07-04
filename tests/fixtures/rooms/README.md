# Room fixtures

Committed input images for testing the image-editing flow (`src/routes/api/edit-image`)
and, later, the live agent conversation. Kept in-repo so tests are deterministic and
don't depend on generating a fresh room each run.

## `ikea-room.png`

A landscape photo of an IKEA-heavy student living room — deliberately packed with
recognisable pieces so the edit + vision pipeline has plenty to work on:
KALLAX shelving with DRÖNA boxes, a POÄNG armchair, a BILLY bookcase, a LACK side
table, a blue flat-pack sofa, and a floor lamp.

Use it as the **source photo** posted to `POST /api/edit-image` (base64 data URI in
the `image` field) to exercise IKEA removal / object replacement / in-room renders,
and to check that the vision pass names the IKEA products it should.

Generated once via the OpenRouter Image API (`google/gemini-3.1-flash-image`) and
committed — do not regenerate casually, tests pin to this exact image. To recreate a
similar one, prompt that model for "a cramped student living room furnished almost
entirely with IKEA (BILLY, KALLAX, POÄNG, LACK, KLIPPAN, RANARP)".
