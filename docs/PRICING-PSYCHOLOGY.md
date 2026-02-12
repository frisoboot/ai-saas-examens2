# Pricing Psychology Onderzoek — AI Examentrainer

> Onderzoek naar pricing psychology best practices, specifiek voor de Nederlandse edtech-markt (studenten 14-18 jaar). Gebaseerd op wetenschappelijke bronnen over pricing psychology, SaaS conversie-optimalisatie, en marktanalyse van Nederlandse concurrenten.

---

## Huidige Pricing-structuur

| Plan | Prijs | Duur | Badge | Type |
|------|-------|------|-------|------|
| Maandelijks | €14,95/maand | Doorlopend | — | Abonnement |
| Examenpakket | €39 totaal | 4 maanden | POPULAIR | Eenmalig |
| Jaarpakket | €99 totaal | 12 maanden | BESTE DEAL | Eenmalig |

**Wat al goed is:**
- 3 tiers — wetenschappelijk optimaal (compromise effect)
- Examenpakket als default/highlighted plan — juiste keuze
- €39 prijs — sterk gepositioneerd vs. concurrentie
- €99 Jaarpakket — onder de psychologische €100-grens
- "Geen abonnement nodig" framing op packages — sterk voor ouders

---

## Aanbeveling 1: Verbeter de visuele hierarchie van de pricing cards

**Probleem:** Alle drie de kaarten zijn qua grootte gelijk. De Examenpakket-kaart heeft een gekleurde rand en badge, maar valt niet genoeg op als dé keuze.

**Wat te doen:**
- Maak de Examenpakket-kaart **fysiek groter** — meer padding, iets opgetild met `scale-105` of extra verticale ruimte
- Gebruik een **filled/gradient CTA-button** (oranje/amber) **alleen** op de Examenpakket-kaart
- Maak de CTA-buttons van Maandelijks en Jaarpakket **outlined/ghost** buttons — minder opvallend
- Voeg een subtiele **animated pulse of glow** toe aan de POPULAIR badge

**Waarom dit werkt:**
Pricing pages zonder een visueel gehighlighte aanbevolen tier converteren 22% slechter (InfluenceFlow 2026 UX study). Het menselijk oog wordt naar het grootste/meest kleurrijke element getrokken. Door de Examenpakket-kaart visueel dominant te maken, stuur je de keuze.

**Verwacht effect:** +22% conversie op de Examenpakket-tier

**Bestanden:** `components/LandingPageNew.tsx`

---

## Aanbeveling 2: Toon per-maand equivalent als hoofdprijs op packages

**Probleem:** De Examenpakket-kaart toont "€39 totaal" als hoofdprijs. Dit geeft sticker shock — studenten zien een bedrag van €39 en voelen dat als "duur", terwijl het maar €9,75 per maand is.

**Wat te doen:**
- **Examenpakket:** Toon `€9,75/maand` als grote, prominente prijs. Daaronder in kleiner formaat: `€39 totaal, eenmalig`
- **Jaarpakket:** Toon `€8,25/maand` als grote prijs. Daaronder: `€99 totaal, eenmalig`
- **Maandelijks:** Blijft `€14,95/maand`

**Waarom dit werkt:**
Het "pennies-a-day" temporal reframing effect (Journal of Consumer Research) toont aan dat het herkadren van een jaarlijkse donatie als "85 cent per dag" de acceptatie verhoogde van 30% naar 52%. Hetzelfde principe geldt hier: €9,75/maand voelt veel toegankelijker dan €39 in één keer. RevenueCat's onderzoek bevestigt +10-40% conversie bij deze aanpak.

**Bonus — in marketingtekst (niet op de kaart zelf):** Frame als "minder dan €0,33 per dag" of "minder dan een broodje in de kantine" — relatable ankers voor Nederlandse tieners.

**Verwacht effect:** +10-40% conversie

**Bestanden:** `components/LandingPageNew.tsx`, `components/CheckoutForm.tsx`

---

## Aanbeveling 3: Voeg doorgestreepte besparingsprijzen toe

**Probleem:** De besparing ten opzichte van maandelijks betalen is niet zichtbaar. Studenten/ouders moeten zelf rekenen — en dat doen ze niet.

**Wat te doen:**
- **Examenpakket:** Toon ~~€59,80~~ → **€39** (bespaar 35%)
- **Jaarpakket:** Toon ~~€179,40~~ → **€99** (bespaar 45%)

De doorgestreepte prijs is wat je zou betalen als je 4 of 12 maanden het maandelijkse plan zou nemen.

**Waarom dit werkt:**
Dan Ariely's beroemde Economist-experiment toonde aan dat een strategisch geplaatste "slechte deal" (het maandplan) de target-optie (Examenpakket) onweerstaanbaar maakt. Maar dit werkt alleen als de vergelijking **expliciet zichtbaar** is. Doorgestreepte prijzen activeren loss aversion — mensen willen de "besparing" niet mislopen.

**Verwacht effect:** +20-30% op package selectie

**Bestanden:** `components/LandingPageNew.tsx`

---

## Aanbeveling 4: Herschrijf features naar outcome-framing

**Probleem:** De huidige featurelijst is technisch/feature-gericht. Studenten geven niet om "AI-oefenvragen" — ze willen een hoger cijfer halen.

**Wat te veranderen:**

| Huidige tekst | Nieuwe tekst |
|--------------|-------------|
| "Onbeperkt AI-oefenvragen" | **"Scoor hoger op je examen"** |
| "Alle 16 vakken" | **"Al je examenvakken op 1 plek"** |
| "Persoonlijke AI-tutor" | **"Direct hulp bij elke vraag, 24/7"** |
| — | **"Goedkoper dan 1 uur bijles"** (nieuw) |

**Waarom dit werkt:**
Outcome-framing ("score higher") activeert het doel van de student, terwijl feature-framing ("unlimited questions") een middel beschrijft. Onderzoek van The Good toont dat outcome-focused copy 15-30% beter converteert dan feature-focused copy op SaaS pricing pages.

**Verwacht effect:** +15-30% perceived value

**Bestanden:** `components/LandingPageNew.tsx`

---

## Aanbeveling 5: Voeg examen-countdown urgentie toe

**Probleem:** Er is geen urgentie-element op de pricing page. Studenten stellen aankoop uit ("doe ik later wel").

**Wat te doen:**
- Voeg een banner/badge toe boven de pricing sectie: *"Het centraal examen begint over X dagen"*
- Dynamisch berekend op basis van de examendatum (mei 2026)
- **Alleen tonen van januari t/m mei** — buiten het examen-seizoen is het niet relevant
- Dit is **authentieke** urgentie — geen nep-countdown-timer

**Waarom dit werkt:**
Urgentie verhoogt conversie, maar alleen als het authentiek is. Nep-timers worden door Gen Z direct doorgeprikt en schaden vertrouwen. Een examen-countdown is écht — het examen komt er daadwerkelijk aan, en elke dag die je niet oefent is een gemiste kans. Voor tieners is peer-driven FOMO ("je klasgenoten oefenen al") extra krachtig.

**Verwacht effect:** +10-15% seizoensconversie (januari-mei)

**Bestanden:** `components/LandingPageNew.tsx`

---

## Aanbeveling 6: Voeg social proof toe bij de pricing

**Probleem:** Geen testimonials, geen gebruikersaantallen, geen vertrouwenssignalen bij het moment van de aankoopbeslissing.

**Wat te doen:**
- 2-3 student testimonials met **concrete cijfers**: *"Ik ging van een 5,2 naar een 7,8 voor scheikunde"*
- Kwantitatieve social proof: *"X studenten oefenen met AI Examentrainer"*
- School-level social proof: *"Leerlingen van X+ scholen"* (als dit klopt)
- Peer-driven messaging: *"Je klasgenoten oefenen al"* — voor tieners is dit sterker dan een generiek gebruikersaantal

**Waarom dit werkt:**
Social proof op pricing pages verhoogt conversies met 15-25% (Genesys Growth 2025). Testimonials met concrete resultaten ("van 5,2 naar 7,8") zijn 84% effectiever dan vage lof (comScore A/B test). Voor tieners is social proof van leeftijdsgenoten het sterkste overtuigingsmiddel.

**Verwacht effect:** +15-25% conversie

**Bestanden:** `components/LandingPageNew.tsx`

---

## Aanbeveling 7: Voeg een vergelijkingstabel met concurrenten toe

**Probleem:** Studenten/ouders weten niet hoe goedkoop €39 is ten opzichte van de alternatieven die ze overwegen.

**Wat te doen — voeg een sectie toe onder de pricing cards:**

| | AI Examentrainer | Lyceo Examentraining | Bijles |
|---|---|---|---|
| **Prijs** | Vanaf €9,75/maand | €340-350 per vak | €22-40 per uur |
| **Vakken** | Alle 16 vakken | 1 vak per training | 1 vak per sessie |
| **Beschikbaarheid** | 24/7, onbeperkt | 1 weekend per vak | Op afspraak |
| **AI-feedback** | Direct, bij elke vraag | Geen | Alleen tijdens sessie |

**Extra per-exam framing:** Als een student 20 oefenexamens maakt in 4 maanden, kost het Examenpakket **€1,95 per examen**. Vergelijk: Examenbundel boek = €23/vak, Lyceo training = €340+/vak.

**Waarom dit werkt:**
Anchoring — door je prijs naast een veel duurdere alternatieven te zetten, voelt €39 als een koopje. Dit is hetzelfde principe als waarom restaurants een fles wijn van €80 op de kaart zetten: niet om die te verkopen, maar om de fles van €35 redelijk te laten lijken. Voor ouders die de aankoopbeslissing maken, is deze vergelijking bijzonder overtuigend.

**Verwacht effect:** +15-30% perceived value

**Bestanden:** `components/LandingPageNew.tsx` (nieuwe sectie na pricing cards)

---

## Wat NIET veranderen

| Aspect | Waarom behouden |
|--------|----------------|
| 3 pricing tiers | Compromise effect — wetenschappelijk optimaal. 62% succesvolle SaaS bedrijven gebruiken 3 tiers. |
| €14,95 maandprijs | Maximaal decoy-effect: 4 maanden = €59,80 vs. €39 examenpakket = 35% besparing |
| €39 Examenpakket | Goed gepositioneerd: goedkoper dan 1 Lyceo training (€340+), dekt alle vakken |
| €99 Jaarpakket | Onder de cruciale €100 psychologische grens (2 vs. 3 cijfers) |
| Examenpakket als default | 4 maanden = precies het examen-seizoen (jan-mei). Perfecte product-market fit. |
| "Geen abonnement nodig" | Nederlandse ouders zijn wantrouwend over doorlopende abonnementen voor hun kinderen |

---

## Samenvatting: Implementatievolgorde

| Prioriteit | Wat | Verwacht effect | Moeite |
|-----------|-----|----------------|--------|
| 1 | Visuele hierarchie pricing cards | +22% conversie | Laag (CSS) |
| 2 | Per-maand equivalent als hoofdprijs | +10-40% conversie | Laag (tekst) |
| 3 | Doorgestreepte besparingsprijzen | +20-30% package selectie | Laag (tekst) |
| 4 | Value framing features herschrijven | +15-30% perceived value | Laag (tekst) |
| 5 | Examen-countdown | +10-15% seizoensconversie | Medium (logica) |
| 6 | Social proof sectie | +15-25% conversie | Medium (content nodig) |
| 7 | Vergelijkingstabel concurrenten | +15-30% perceived value | Laag (tekst) |

**Quick wins (stap 1-4):** Kunnen in 1 sessie geïmplementeerd worden. Puur CSS en tekstaanpassingen.
**Medium effort (stap 5-7):** Vereisen nieuwe componenten/secties, maar geen backend-wijzigingen.

---

## Bronnen

- [Compromise, Anchoring and Decoy Effects — Potio](https://www.potio.cc/blog/pricing-strategies-compromise-anchoring-decoy)
- [SaaS Pricing Page Best Practices 2026 — InfluenceFlow](https://influenceflow.io/resources/saas-pricing-page-best-practices-complete-guide-for-2026/)
- [SaaS Pricing Page Design Best Practices 2026 — DesignStudioUIUX](https://www.designstudiouiux.com/blog/saas-pricing-page-design-best-practices/)
- [Subscription Pricing Psychology — RevenueCat](https://www.revenuecat.com/blog/growth/subscription-pricing-psychology-how-to-influence-purchasing-decisions/)
- [The Pennies-a-Day Effect — Psychology Today / Journal of Consumer Research](https://www.psychologytoday.com/us/blog/the-science-behind-behavior/201904/the-powerful-influence-pennies-day-price-offers)
- [The Anchoring Effect in SaaS Pricing — Monetizely](https://www.getmonetizely.com/articles/the-anchoring-effect-in-saas-pricing-using-high-prices-to-drive-sales)
- [The Power of Rounding: €99 vs €100 — Monetizely](https://www.getmonetizely.com/articles/the-power-of-rounding-why-99-vs-100-matters-in-saas-pricing-strategy)
- [Price Framing Strategies — Monetizely](https://www.getmonetizely.com/articles/price-framing-strategies-how-presentation-affects-perception)
- [EdTech Pricing Models — Monetizely](https://www.getmonetizely.com/articles/edtech-pricing-models-monetizing-education-technology-effectively)
- [Social Proof Conversion Stats — Genesys Growth](https://genesysgrowth.com/blog/social-proof-conversion-stats-for-marketing-leaders)
- [SaaS Free Trial Conversion Benchmarks — First Page Sage](https://firstpagesage.com/seo-blog/saas-free-trial-conversion-rate-benchmarks/)
- [The Psychology Behind Successful SaaS Pricing — The Good](https://thegood.com/insights/saas-pricing/)
- [SaaS Pricing Psychology — Dodo Payments](https://dodopayments.com/blogs/pricing-psychology)
- [Pricing Page Best Practices — Userpilot](https://userpilot.com/blog/pricing-page-best-practices/)
- [What Actually Works in SaaS Pricing 2025 — GrowthUnhinged](https://www.growthunhinged.com/p/2025-state-of-saas-pricing-changes)
- [SaaS Pricing Best Practices 2025 — Artisan Strategies](https://www.artisangrowthstrategies.com/blog/saas-pricing-page-best-practices-2025)
- [Which CTA Button Color Converts Best — CXL](https://cxl.com/blog/which-color-converts-the-best/)
- [Charm Pricing Research — PayPro Global](https://payproglobal.com/answers/what-is-saas-charm-pricing/)
- [Lyceo Tarieven 2025 — Scholiersupport](https://scholiersupport.nl/lyceo-tarieven/)
