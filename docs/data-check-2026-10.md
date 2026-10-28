# Data check: peaks, routes, trail names, via ferratas (2026-10-28)

The 98 prominent 2000ers were checked against hribi.net (heights, coordinates, every listed route with its start and PZS category). The 704 routes the site shows were checked against the same data. Via ferratas were checked against OSM, bergsteigen.com, via-ferrata.de and exploreslovenia.si. Fixes are in web-v0.27.

Only facts were compared (heights, start names, difficulty categories). No hribi.net text is copied into the site.

## Peaks
- 84 of 98 peaks are on hribi.net. These 14 are LiDAR sub-tops that hribi.net doesn't list:
  - Pelc nad Klonicami, Dovški Gamsovec, Kotova špica, Šite, Luknja peč, Bedinji vrh, Visoka špica
  - Skala, Srebrnjak, Rušica, Veliki Pihavec, Tegoška gora, Plešivec, Ablanca
  - Ablanca's page did not load, so it was not checked.
- Coordinates agree within 150 m. The two exceptions are naming, not errors:
  - Kanjavec (175 m): hribi.net lists the west and main summits separately.
  - Planjava (282 m): we use the west summit, hribi.net the east (main) one.
- Heights agree within 5 m except these. We keep the LiDAR maximum; the official GURS point can sit lower.
  - Plaski Vogel: 2356 vs 2348
  - Mala Zelnarica: 2321 vs 2310
  - Velika Baba (Kanin): 2161 vs 2148
- There are two peaks named Goličica, and both are real:
  - 2106 m in Trenta (hribi.net)
  - 2076 m north of Prisank (OSM, Peakbagger)
  - Worth adding a suffix to the names.
- hribi.net lists some 2000 m tops in Slovenia that aren't in our list. These are probably below our prominence rule; check them against the rule:
  - Kanin ridge: Divja koza, Koštrunove špice
  - Julian Alps: Vršaki sub-tops, Velika Mojstrovka (east summit), Plesišče, Vodnikov Vršac, Drobeče Sleme, Šitna glava, Visoki Pipar, Oklo, Vrh Grubje
  - Kamnik–Savinja Alps: Lučka Brana (Baba), Planjava west summit
  - Karavanke: Pungartska gora

## Difficulty (normal route)
- 42 of 84 peaks had a different difficulty class than hribi.net's easiest route (PZS lahka / zahtevna / zelo zahtevna).
- OSM sac_scale tags in Slovenia fit poorly. T4 is used for both "zahtevna" and "zelo zahtevna" paths, and some easy normal routes are tagged T4–T5.
- **Fix:** the peak class now comes from hribi.net for those 42 peaks (`data/tech_overrides.json`, src: hribi.net). This feeds the weather rating and the "⚠ above your limit" warnings.
- Examples:
  - Mangart, Prisank, Skuta, Jezerska Kočna: 3 → 2
  - Storžič, Grintovec, Stenar, Križ, Kalški greben, Begunjščica: → 1
  - Vrh Laške planje, Travnik, Velika Tičarica: → 3

## Trailheads and route names
- 156 different start points were used. Many were named after the nearest place or hut within 4 km, which gave Italian or Austrian names and odd labels:
  - "pri Alpe Moritsch" for the Mangart saddle
  - "pri Apnen Graben" for Planica
  - "pri Ogradec" for Logarska dolina
- **Fix:** 64 trailheads now use the names hribi.net and PZS use (`data/data_fixes.json → starts`). Examples: Aljažev dom v Vratih, Konec ceste na Pokljuki (Pri Lesi), Mangartsko sedlo, Planica, Zadnja Trenta (Flori), Zadnjica, Ravenska Kočna, V Koncu, Kamniška Bistrica (Jermanca), Logarska dolina, Planina Podvežak, Ljubelj.
- Route names:
  - A hiking-relation name is shown only if the relation covers at least half of the route. It used to happen that a Pokljuka route was labelled "Krma – Staničev dom".
  - The PZS badge no longer appears on Italian and Austrian routes (CAI, Alpenverein and numbered paths).
  - The start hut is no longer repeated in "čez …".
- Still open:
  - hribi.net starts we don't show yet: Kepa from the Slovenian side (Belca, Erjavčev rovt), Peca (Mežica, Topla, Podpeca), Raduha, Stol and Begunjščica starts, Kanin/Prestreljenik by cable car.
  - Cause: either the router keeps only ~9 routes per peak, or OSM is missing the parking.
  - Some starts still have automatic names (e.g. "pri Zagon" near Begunjščica).

## Closed paths and huts
- **Pot čez Žrelo** (Ravenska Kočna – Kranjska koča) is marked closed on hribi.net. It is now left out of routing; the line stays on the map.
- Kranjska koča na Ledinah stays closed for the 2026 season (renovation; Siol, 29 May 2026). Hut status is not shown yet.

## Via ferratas
- OSM has 58 via ferrata pieces in our area. Most Slovenian "zelo zahtevne" secured paths are tagged as normal paths, not as via ferratas. One example is the Mangart "Slovenska smer" (graded B by bergsteigen.com), so it doesn't show as a ferrata.
- Grade and name fixes (`data/data_fixes.json → ferratas`):

| Ferrata | Was (OSM) | Now | Source |
|---|---|---|---|
| Hvadnik | C | B/C | exploreslovenia.si |
| Češka koča | D/E | C/D | exploreslovenia.si |
| Zelenica | C–E | B/E, renamed "Spodnji plot" | exploreslovenia.si |
| Mučevo | E/C | B/E | exploreslovenia.si |
| Olimpline | mixed | C/F | exploreslovenia.si |
| Via Italiana (Mangart) | C+ | C | bergsteigen.com |

- Divisione Julia (Kanin, C) matches.

## Next
- Walking times vs hribi.net times. Not checked yet: the test environment has no real terrain heights.
- Add missing Slovenian trailheads (Kepa, Peca, Raduha) to the start list if OSM lacks them.
- Hut open/closed status (PZS).
- Mark more secured paths (e.g. Mangart Slovenska smer) as ferratas in our fixes.
