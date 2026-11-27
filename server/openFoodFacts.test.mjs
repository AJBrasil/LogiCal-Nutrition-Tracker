import test from "node:test";
import assert from "node:assert/strict";
import { createProductSearch } from "./openFoodFacts.mjs";

test("submitted text queries Open Food Facts, maps a consistent portion and caches repeat queries", async () => {
  let calls = 0;
  const search = createProductSearch(async url => {
    calls++;
    assert.equal(url.hostname, "world.openfoodfacts.org");
    assert.equal(url.searchParams.get("search_terms"), "test & cereal");
    return Response.json({products:[{product_name:"Cereal", brands:"House", code:"123", serving_size:"30 g",
      nutriments:{"energy-kcal_serving":100, "energy-kcal_100g":340, proteins_100g:9, carbohydrates_100g:70, fat_100g:0, sodium_100g:0.02}},
      {product_name:"Incomplete",code:"2",nutriments:{}}]});
  });
  const rows = await search("Test & Cereal");
  assert.equal(rows.length,1);
  assert.deepEqual([rows[0].name,rows[0].servingSize,rows[0].calories,rows[0].fat,rows[0].sodium],["House Cereal","100 g",340,0,20]);
  await search("test & cereal");
  assert.equal(calls,1);
});

test("provider failures remain retryable and distinct from an empty search", async () => {
  let calls = 0;
  const search = createProductSearch(async () => ++calls === 1 ? new Response(null,{status:429}) : Response.json({products:[]}));
  await assert.rejects(search("cereal"),{status:429});
  assert.deepEqual(await search("cereal"),[]);
});

test("recovers connection setup errors through the native client", async () => {
  let retries = 0;
  const search = createProductSearch(async () => {throw new TypeError("fetch failed",{cause:{code:"UNABLE_TO_VERIFY_LEAF_SIGNATURE"}});},
    async url => {retries++; assert.equal(url.protocol,"https:"); return Response.json({products:[]});});
  assert.deepEqual(await search("oats"), []);
  assert.equal(retries,1);
});

test("reports the upstream HTTP status without retrying rejected requests", async () => {
  const search = createProductSearch(async () => new Response(null,{status:403}), () => assert.fail("unexpected retry"));
  await assert.rejects(search("oats"),{status:502,detail:"upstream-403"});
});

test("a legacy search outage returns selectable products from the independent index", async () => {
  const search = createProductSearch(async url => {
    if (url.pathname === "/cgi/search.pl") return new Response(null,{status:503});
    assert.equal(url.hostname,"search.openfoodfacts.org");
    return Response.json({hits:[{code:"123456789",product_name:"Oat cereal",brands:["House"]}]});
  });
  assert.deepEqual(await search("oats"),[{barcode:"123456789",name:"House Oat cereal",source:"Open Food Facts",needsLabel:true}]);
});
