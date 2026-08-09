Recipe Search & Meal Planner
Core Requirements:
Build an app that searches recipes via a public API and allows users to build a shopping list,
with good user experience to find and navigate through various recipes.
Key Features:
1. Recipe Search & Display
• Search recipes using the Meal DB API. Example searches:
o https://www.themealdb.com/api/json/v1/1/search.php?s=beef
o https://www.themealdb.com/api/json/v1/1/search.php?s=pudding
• Provide a search box to allow users to input a search term.
• When the user presses “Enter”, display results in a grid with: image (field:
strMealThumb), title (field: strMeal), category, area
• Click to view detailed recipe (ingredients, instructions, youtube, source) in a modal
popup panel.
2. Shopping List Builder
• On the detailed recipe view, add a new button with text “add to my shopping list”
• When this button is clicked, iterate through ingredient and measure fields and save
to local storage.
• On all pages in the app, have a button with the test “view my shopping list”. When
clicked, list all ingredients in alphabetical order, with their measures – as extracted
from local storage.
UI Requirements:
• Search page: Search bar, matching results grid
• Recipe modal/panel: Full details with ingredient breakdown
• Navigation: have easy navigation to search, shopping list or “surprise me” from
anywhere in the app.
o When “surprise me” is clicked, show the result from
https://www.themealdb.com/api/json/v1/1/random.php in the recipe modal
panel
