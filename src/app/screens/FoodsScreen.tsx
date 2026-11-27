import { useState } from "react";
import { toast } from "sonner";
import TabBar from "../components/TabBar";
import EntryModal from "../components/EntryModal";
import {
  getFavoriteMeals,
  saveFavoriteMeal,
  removeFavoriteMeal,
  type FoodEntry,
  type MealComponent,
} from "../services/storageService";
import { recipePortion,scaleExtras } from "../services/nutrients";
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
  const [builder,setBuilder] = useState<"recipe"|"meal"|null>(null);
  const [name, setName] = useState("");
  const [yieldCount, setYield] = useState("4");
  const [parts, setParts] = useState<MealComponent[]>([]);
  const choices = foods.filter(food => !food.meal);
  const isMeal = builder === "meal";
  const yieldValue = isMeal ? 1 : Number(yieldCount);
  const total = parts.length && parts.every(p=>Number.isFinite(p.quantity) && p.quantity > 0) && Number.isFinite(yieldValue) && yieldValue > 0
    ? recipePortion(parts,yieldValue) : null;

  function startBuilder(kind:"meal"|"recipe",existing?:FoodEntry) {
    setEditing(existing?.id);
    setName(existing?.name ?? "");
    setParts(existing?.meal?.items ?? []);
    setYield("4");
    setBuilder(kind);
  }

  function component(food:FoodEntry):MealComponent["food"] {
    const {id,name,servingSize,calories,protein,carbs,fat,grams} = food;
    return {id,name,servingSize,calories,protein,carbs,fat,grams,...scaleExtras(food)};
  }

  function saveCombination() {
    if (!total || !name.trim() || (isMeal && parts.length < 2)) return;
    if (foods.some(food => food.id !== editing && food.name.toLowerCase() === name.trim().toLowerCase())) {
      toast("That name is already in your library. Choose another name.");
      return;
    }
    saveFavoriteMeal({
      ...total,name:name.trim(),time:"afternoon",servingSize:isMeal ? "1 meal" : "1 serving",
      ...(isMeal ? {meal:{items:parts}} : {recipe:{yield:yieldValue,items:parts.map(p=>({name:p.food.name,quantity:p.quantity}))}}),
    },editing);
    setBuilder(null);
    toast(isMeal ? "Meal saved" : "Recipe saved");
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
              setBuilder(null);
              setDraft(empty);
            }}
          >
            Add food
          </button>
          <button onClick={scan}>Scan barcode</button>
          <button onClick={()=>startBuilder("recipe")}>Add Recipe</button>
          <button onClick={()=>startBuilder("meal")}>Add Meal</button>
        </div>
        {builder && (
          <form className="nutrition-panel" onSubmit={e=>{e.preventDefault(); saveCombination();}}>
            <h3>{isMeal ? "Meal" : "Batch recipe"}</h3>
            <p>{isMeal ? "Combine foods you eat together. Log the whole meal in one step." : "Combine ingredients and enter how many servings the batch makes."}</p>
            {!choices.length && <p>Add a food to your library to get started.</p>}
            <label>
              {isMeal ? "Meal name" : "Recipe name"}
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            {!isMeal && <label>
              Batch yield (servings)
              <input
                required
                type="number"
                step="any"
                min=".01"
                value={yieldCount}
                onChange={(e) => setYield(e.target.value)}
              />
            </label>}
            {parts.map((v, index) => (
              <div className="nutrition-actions" key={index}>
                <select
                  aria-label={isMeal ? "Food item" : "Ingredient"}
                  value={v.food.id}
                  onChange={(e) =>
                    setParts(
                      parts.map((p, i) =>
                        i === index ? { ...p, food: component(choices.find(f=>f.id===Number(e.target.value))!) } : p,
                      ),
                    )
                  }
                >
                  {!choices.some(f=>f.id===v.food.id) && <option value={v.food.id}>{v.food.name}</option>}
                  {choices.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} · {f.servingSize || "1 serving"}
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
                disabled={!choices.length}
                onClick={() =>
                  setParts([...parts, { food:component(choices.find(f=>!parts.some(p=>p.food.id===f.id)) || choices[0]), quantity: 1 }])
                }
              >
                {isMeal ? "Add food item" : "Add ingredient"}
              </button>
              <button disabled={!name.trim() || !total || (isMeal && parts.length < 2)}>{isMeal ? "Save meal" : "Save recipe"}</button>
              <button type="button" onClick={()=>setBuilder(null)}>Cancel</button>
            </div>
            {total && <p>{isMeal ? "Whole meal" : "Per recipe serving"} · {total.calories} kcal · {total.protein} g protein · {total.carbs} g carbs · {total.fat} g fat</p>}
          </form>
        )}
        <label>
          Search foods, recipes, and meals
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
            {f.meal && <details><summary>Meal · {f.meal.items.length} food items</summary>
              {f.meal.items.map((item,i)=><p key={i}>{item.quantity} × {item.food.name} · {item.food.servingSize || "1 serving"}</p>)}
            </details>}
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
                {f.meal ? "Log meal" : "Log serving"}
              </button>
              <button
                onClick={() => {
                  if (f.meal) {startBuilder("meal",f);return;}
                  setBuilder(null);
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
          <p>No matching foods, recipes, or meals.</p>
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
