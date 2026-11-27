The bundled catalog contains USDA FoodData Central Foundation Foods (October 2024) and FNDDS 2021–2023 (October 2024). Nutrients are amounts per 100 g of edible food. Fields absent from the source are omitted. The importer skips records missing energy, carbohydrate, fat or protein. Portion descriptions and gram weights belong to the individual FDC record.

To refresh, download the Foundation and Survey JSON ZIP archives from USDA, then run `python3 server/catalog/import-usda.py foundation.zip survey.zip` from the repository root. Restart the server to load the refreshed catalog. The app builds a separate in-memory SQLite search index from the compressed file on first use. Diary backups contain the logged nutrient and portion snapshots.

https://fdc.nal.usda.gov/download-datasets/
