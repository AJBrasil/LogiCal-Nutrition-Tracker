import { useState } from "react";
import { toast } from "sonner";
import TabBar from "../components/TabBar";
import EntryModal from "../components/EntryModal";
import {
  getFavoriteMeals,
  saveFavoriteMeal,
  removeFavoriteMeal,
  type FoodEntry,
} from "../services/storageService";
import { recipePortion } from "../services/nutrients";
import type { Screen, ModalMacros } from "../types";
const empty: ModalMacros = {
  name: "",
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  time: "morning",
};
export default function FoodsScreen({
  navigate,
  scan,
  log,
}: {
  navigate: (s: Screen) => void;
  scan: () => void;
  log: (food: ModalMacros) => void;
}) {
  const foods = getFavoriteMeals();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<ModalMacros | null>(null);
  const [editing, setEditing] = useState<number>();
  const [recipe, setRecipe] = useState(false);
  const [name, setName] = useState("");
  const [yieldCount, setYield] = useState("4");
  const [parts, setParts] = useState<{ id: number; quantity: number }[]>([]);
  function saveRecipe() {
    const ingredients = parts.map((i) => ({
      food: foods.find((f) => f.id === i.id),
      quantity: i.quantity,
    }));
    if (
      !name.trim() ||
      !ingredients.length ||
      ingredients.some((i) => !i.food || i.quantity <= 0) ||
      Number(yieldCount) <= 0
    )
      return;
    const items = ingredients as { food: FoodEntry; quantity: number }[];
    saveFavoriteMeal({
      ...recipePortion(items, Number(yieldCount)),
      name: name.trim(),
      time: "afternoon",
      servingSize: "1 serving",
      recipe: {
        yield: Number(yieldCount),
        items: items.map((i) => ({ name: i.food.name, quantity: i.quantity })),
      },
    });
    setRecipe(false);
    setParts([]);
    setName("");
    toast("Recipe saved");
  }
  const matches = foods.filter((f) =>
    [f.name, f.alias, f.barcode].some((v) =>
      v?.toLowerCase().includes(search.toLowerCase()),
    ),
  );
  return (
    <div className="flex flex-col h-full">
      <main className="foods-page flex-1 overflow-y-auto">
        <h1>Foods</h1>
        <div className="nutrition-actions">
          <button
            onClick={() => {
              setEditing(undefined);
              setDraft(empty);
            }}
          >
            Add food
          </button>
          <button onClick={scan}>Scan barcode</button>
          <button disabled={!foods.length} onClick={() => setRecipe(!recipe)}>
            Build recipe
          </button>
        </div>
        {recipe && (
          <form
            className="nutrition-panel"
            onSubmit={(e) => {
              e.preventDefault();
              saveRecipe();
            }}
          >
            <h3>Batch recipe</h3>
            <label>
              Recipe name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Batch yield (servings)
              <input
                required
                type="number"
                step="any"
                min=".01"
                value={yieldCount}
                onChange={(e) => setYield(e.target.value)}
              />
            </label>
            {parts.map((v, index) => (
              <div className="nutrition-actions" key={index}>
                <select
                  aria-label="Ingredient"
                  value={v.id}
                  onChange={(e) =>
                    setParts(
                      parts.map((p, i) =>
                        i === index ? { ...p, id: Number(e.target.value) } : p,
                      ),
                    )
                  }
                >
                  {foods.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <label>
                  Servings
                  <input
                    required
                    type="number"
                    min=".01"
                    step="any"
                    value={v.quantity || ""}
                    onChange={(e) =>
                      setParts(
                        parts.map((p, i) =>
                          i === index
                            ? { ...p, quantity: Number(e.target.value) }
                            : p,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setParts(parts.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="nutrition-actions">
              <button
                type="button"
                onClick={() =>
                  setParts([...parts, { id: foods[0].id, quantity: 1 }])
                }
              >
                Add ingredient
              </button>
              <button disabled={!parts.length}>Save recipe</button>
            </div>
          </form>
        )}
        <label>
          Search foods and recipes
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {matches.map((f) => (
          <article key={f.id} className="nutrition-panel">
            <h3>{f.name}</h3>
            <p>
              {f.calories} kcal · {f.protein}g protein ·{" "}
              {f.servingSize || "1 serving"}
              {f.grams ? " · " + f.grams + " g" : ""}
            </p>
            {f.recipe && (
              <details>
                <summary>Batch of {f.recipe.yield} servings</summary>
                {f.recipe.items.map((x, i) => (
                  <p key={i}>
                    {x.quantity} × {x.name}
                  </p>
                ))}
              </details>
            )}
            <div className="nutrition-actions">
              <button
                onClick={() =>
                  log({
                    ...f,
                    time:
                      new Date().getHours() < 12
                        ? "morning"
                        : new Date().getHours() < 17
                          ? "afternoon"
                          : "evening",
                  })
                }
              >
                Log serving
              </button>
              <button
                onClick={() => {
                  setEditing(f.id);
                  setDraft(f);
                }}
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm("Remove " + f.name + " from Foods?"))
                    removeFavoriteMeal(f.id);
                }}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
        {foods.length > 0 && !matches.length && (
          <p>No matching foods or recipes.</p>
        )}
        {!foods.length && (
          <p>Save a food label or scan a package to start your library.</p>
        )}
      </main>
      <TabBar activeScreen="foods" onTabChange={navigate} />
      {draft && (
        <EntryModal
          library
          initialData={draft}
          onClose={() => setDraft(null)}
          onLog={(item) => {
            saveFavoriteMeal(item, editing);
            setDraft(null);
            toast("Food saved");
          }}
        />
      )}
    </div>
  );
}
