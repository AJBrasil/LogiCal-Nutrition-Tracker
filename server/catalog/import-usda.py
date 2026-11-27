"""Build everyday-foods.json.gz from USDA Foundation and FNDDS JSON download archives."""
import gzip
import json
import sys
import zipfile
from pathlib import Path

rows = []
for filename in sys.argv[1:]:
    with zipfile.ZipFile(filename) as archive:
        member = next(name for name in archive.namelist() if name.endswith(".json"))
        foods = next(iter(json.load(archive.open(member)).values()))
    for food in foods:
        nutrients = {n["nutrient"]["id"]: n["amount"] for n in food["foodNutrients"] if n.get("amount") is not None}
        fields = {"calories": next((nutrients[k] for k in (1008, 2048, 2047) if k in nutrients), None)}
        for name, ids in {"protein":[1003], "carbs":[1005], "fat":[1004], "fiber":[1079],
                          "sugar":[2000, 1063], "sodium":[1093], "saturatedFat":[1258]}.items():
            fields[name] = next((nutrients[k] for k in ids if k in nutrients), None)
        if any(fields[k] is None for k in ("calories", "protein", "carbs", "fat")):
            continue
        portions = []
        for p in sorted(food.get("foodPortions", []), key=lambda x: x.get("sequenceNumber", 0)):
            grams = p.get("gramWeight", 0)
            label = p.get("portionDescription", "").strip()
            unit = p.get("measureUnit", {}).get("name", "")
            if not label and p.get("amount") and unit not in ("", "undetermined"):
                label = f'{p["amount"]:g} {unit} {p.get("modifier", "")}'.strip()
            if label and grams > 0 and "quantity not specified" not in label.lower() and [label, grams] not in portions:
                portions.append([label, grams])
        rows.append(dict(fdcId=food["fdcId"], name=food["description"], portions=portions,
                         **{k:v for k,v in fields.items() if v is not None}))
if not rows:
    sys.exit("No usable foods in supplied archives")
payload = json.dumps(rows, ensure_ascii=False, separators=(",", ":")).encode()
Path(__file__).with_name("everyday-foods.json.gz").write_bytes(gzip.compress(payload, mtime=0))
print(f"{len(rows)} foods")
