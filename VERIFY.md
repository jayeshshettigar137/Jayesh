# Verifying candidates before publishing

`data/candidates.csv` lists named predictions that appeared in search-result snippets. **None is verified.** Search snippets paraphrase, so exact quotes, dates and even attribution may be wrong. Nothing here is published until you check it.

For each candidate you decide to keep:
1. Open the source. Copy the exact quote (word for word) and the date it was said or published.
2. Confirm it is a clear, specific claim (a level and a deadline). Drop hedged or range-only statements.
3. Add a row to `data/receipts/claims.csv` with `verified=yes` only after steps 1-2.
4. Add the outcome to `data/receipts/resolutions.csv`: the highest (for "above") or lowest (for "below") close between the date it was said and the deadline, its date, an `as_of` date, and a source link. Get it from a data provider whose terms allow this use (e.g. CoinGecko on a paid plan with attribution; check current terms). Do not commit raw price series.
5. `python3 -m receipts build --data data/receipts --out site` and check the receipt page.

Do not scrape YouTube or other platforms for transcripts without permission: their terms restrict automated access. Quote from pages you read yourself.
