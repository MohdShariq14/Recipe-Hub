const recipesGrid = document.getElementById("recipes-grid");
const searchBtn = document.getElementById("search-btn");
const searchInput = document.getElementById("search-input");
const notification = document.getElementById("notification");
const savedBtn = document.getElementById("saved-btn");
const savedModal = document.getElementById("saved-modal");
const closeSaved = document.getElementById("close-saved");
const savedRecipesDiv = document.getElementById("saved-recipes");
const fullRecipeModal = document.getElementById("full-recipe-modal");
const fullRecipeContent = document.getElementById("full-recipe-content");
const homeSection = document.getElementById("home-section");
const allBtn = document.getElementById("all-recipes-btn");
const goRecipes = document.getElementById("go-recipes");
const homeBtn = document.getElementById("home-btn");
const hamburger = document.querySelector('.hamburger');
const navItems = document.querySelector('.nav-items');

let savedRecipes = JSON.parse(localStorage.getItem("savedRecipes") || "[]");

// Hamburger toggle
hamburger.addEventListener("click", ()=> navItems.classList.toggle("active"));

// Notification
function showNotification(msg){
    notification.textContent = msg;
    notification.style.display="block";
    setTimeout(()=>notification.style.display="none",3000);
}

// Fetch recipes
async function fetchRecipes(query="") {
    recipesGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;">Loading recipes...</p>`;
    try{
        let meals = [];
        if(query){
            const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`);
            const data = await res.json();
            meals = data.meals || [];
        } else {
            const catRes = await fetch('https://www.themealdb.com/api/json/v1/1/list.php?c=list');
            const categoriesData = await catRes.json();
            const categories = categoriesData.meals.map(c => c.strCategory);
            const allMeals = await Promise.all(
                categories.map(async cat => {
                    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${cat}`);
                    const data = await res.json();
                    return data.meals || [];
                })
            );
            meals = [].concat(...allMeals);
            const seen = new Set();
            meals = meals.filter(m => !seen.has(m.idMeal) && seen.add(m.idMeal));
        }
        displayRecipes(meals);
    } catch(err){
        console.error(err);
        recipesGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;">Error fetching recipes.</p>`;
    }
}

// Display recipes
function displayRecipes(recipes){
    recipesGrid.innerHTML="";
    if(!recipes.length){
        recipesGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;">No recipes found!</p>`;
        return;
    }
    recipes.forEach(recipe=>{
        const card = document.createElement("div");
        card.classList.add("recipe-card");
        card.innerHTML=`
            <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}">
            <div class="content">
                <h3>${recipe.strMeal}</h3>
                <div class="card-actions">
                    <button class="view-btn">View</button>
                    <button class="save-btn">${savedRecipes.some(r=>r.idMeal===recipe.idMeal)?"Saved ❤️":"Save ❤️"}</button>
                </div>
            </div>
        `;
        const viewBtn = card.querySelector(".view-btn");
        const saveBtn = card.querySelector(".save-btn");

        viewBtn.addEventListener("click",()=> showFullRecipe(recipe));
        saveBtn.addEventListener("click",()=> saveRecipe(recipe, saveBtn));
        saveBtn.classList.toggle("saved", savedRecipes.some(r=>r.idMeal===recipe.idMeal));

        recipesGrid.appendChild(card);
    });
}

// Show full recipe
async function showFullRecipe(recipe){
    let fullRecipe = recipe;
    // Fetch full recipe if not already present
    if(!recipe.strInstructions){
        try {
            const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${recipe.idMeal}`);
            const data = await res.json();
            fullRecipe = data.meals[0];
        } catch(err){
            console.error(err);
            showNotification("Error fetching full recipe.");
            return;
        }
    }

    fullRecipeContent.innerHTML=`
        <button id="close-full">&times;</button>
        <h2>${fullRecipe.strMeal}</h2>
        <img src="${fullRecipe.strMealThumb}" alt="${fullRecipe.strMeal}">
        <p><strong>Category:</strong> ${fullRecipe.strCategory || "N/A"}</p>
        <p><strong>Area:</strong> ${fullRecipe.strArea || "N/A"}</p>
        <p><strong>Instructions:</strong></p>
        <p style="white-space: pre-line;">${fullRecipe.strInstructions || "N/A"}</p>
        <p><strong>Ingredients:</strong></p>
        <ul>
            ${[...Array(20)].map((_,i)=>{
                const ing = fullRecipe[`strIngredient${i+1}`];
                const meas = fullRecipe[`strMeasure${i+1}`];
                if(ing && ing.trim()) return `<li style="margin-bottom:5px;">${ing} - ${meas || ""}</li>`;
                return "";
            }).join('')}
        </ul>
        <div class="rating">
            ${[1,2,3,4,5].map(i=>`<span data-rate="${i}">&#9733;</span>`).join('')}
        </div>
    `;

    // Rating stars functionality
    const stars = fullRecipeContent.querySelectorAll(".rating span");
    stars.forEach(star=>{
        star.addEventListener("mouseover",()=> {
            stars.forEach(s=> s.classList.remove("hovered"));
            for(let i=0;i<star.dataset.rate;i++) stars[i].classList.add("hovered");
        });
        star.addEventListener("mouseout",()=> stars.forEach(s=> s.classList.remove("hovered")));
        star.addEventListener("click",()=>{
            stars.forEach(s=> s.classList.remove("selected"));
            for(let i=0;i<star.dataset.rate;i++) stars[i].classList.add("selected");
            showNotification(`You rated ${star.dataset.rate} stars!`);
        });
    });

    // Close button
    document.getElementById("close-full").addEventListener("click",()=> fullRecipeModal.style.display="none");

    // Show modal with black background
    fullRecipeModal.style.display="flex";
    fullRecipeContent.style.background="#000";  // black modal body
    fullRecipeContent.style.color="#fff";       // white text for readability
    fullRecipeContent.style.padding="20px";
    fullRecipeContent.style.borderRadius="12px";
}


// Save recipe
function saveRecipe(recipe, btn){
    const exists = savedRecipes.some(r=>r.idMeal===recipe.idMeal);
    if(!exists){
        savedRecipes.push(recipe);
        btn.textContent="Saved ❤️";
        btn.classList.add("saved");
        showNotification("Recipe saved!");
    } else {
        savedRecipes = savedRecipes.filter(r=>r.idMeal!==recipe.idMeal);
        btn.textContent="Save ❤️";
        btn.classList.remove("saved");
        showNotification("Recipe removed!");
    }
    localStorage.setItem("savedRecipes", JSON.stringify(savedRecipes));
    renderSavedRecipes();
}

// Saved Modal
savedBtn.addEventListener("click",()=>{
    savedModal.style.display="flex";
    renderSavedRecipes();
});
closeSaved.addEventListener("click",()=> savedModal.style.display="none");

function renderSavedRecipes(){
    savedRecipesDiv.innerHTML="";
    if(!savedRecipes.length){
        savedRecipesDiv.innerHTML="<p>No saved recipes.</p>";
        return;
    }
    savedRecipes.forEach(recipe=>{
        const card = document.createElement("div");
        card.classList.add("recipe-card");
        card.innerHTML=`
            <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}">
            <div class="content">
                <h3>${recipe.strMeal}</h3>
                <div class="card-actions">
                    <button class="view-btn">View</button>
                    <button class="remove-btn">Remove</button>
                </div>
            </div>
        `;
        card.querySelector(".view-btn").addEventListener("click",()=> showFullRecipe(recipe));
        card.querySelector(".remove-btn").addEventListener("click",()=>{
            savedRecipes = savedRecipes.filter(r=>r.idMeal!==recipe.idMeal);
            localStorage.setItem("savedRecipes",JSON.stringify(savedRecipes));
            renderSavedRecipes();
            showNotification("Recipe removed!");
        });
        savedRecipesDiv.appendChild(card);
    });
}

// Home & All Recipes logic
recipesGrid.style.display="none";
goRecipes.addEventListener("click",()=>{
    homeSection.style.display="none";
    recipesGrid.style.display="grid";
    fetchRecipes();
});
allBtn.addEventListener("click",()=>{
    homeSection.style.display="none";
    recipesGrid.style.display="grid";
    fetchRecipes();
});
searchBtn.addEventListener("click",()=>{
    homeSection.style.display="none";
    recipesGrid.style.display="grid";
    fetchRecipes(searchInput.value.trim());
});
homeBtn.addEventListener("click",()=>{
    recipesGrid.style.display="none";
    homeSection.style.display="flex";
});
