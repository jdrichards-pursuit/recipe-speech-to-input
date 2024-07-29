import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getUserData } from "../../helpers/getUserData";
import { X, Mic, Plus, Camera } from "lucide-react";

import {
  handleTagClick,
  handleTagEntry,
  handleAddIngredientsInput,
  handleIngredientsInputChange,
  handleIngredientDelete,
  handleStepsInput,
  handleStepsInputChange,
  handleStepDelete,
  handlePublicToggle,
  capitalizeFirstLetter,
} from "../../helpers/helpers";

const URL = import.meta.env.VITE_BASE_URL;

function RecipeForm({ setNewRecipe, newRecipe }) {
  const navigate = useNavigate();
  // user state
  const [userDetails, setUserDetails] = useState(null);
  const [familyName, setFamilyName] = useState(null);
  //State for all categories
  const [categories, setCategories] = useState([]);
  //State for selected categories
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [recipeID, setRecipeID] = useState();
  console.log(selectedCategories);
  // STATES FOR THE MODAL
  const [showModal, setShowModal] = useState(false);
  const [modalChoice, setModalChoice] = useState(null);
  // // STATE FOR THE INGREDIENTS
  const [ingredientsInputs, setIngredientsInputs] = useState([]);

  // STATE FOR THE STEPS
  const [stepsInputs, setStepsInputs] = useState([]);
  console.log("stepsInputs", stepsInputs);
  // STATE FOR PUBLIC TOGGLE
  const [isPublic, setIsPublic] = useState(true);

  // New state for checkbox
  const [isSelfChef, setIsSelfChef] = useState(false);

  // State for recording
  const [recordingIndex, setRecordingIndex] = useState(null);

  const addRecipe = async () => {
    newRecipe.user_id = userDetails.id;
    newRecipe.status = isPublic;
    newRecipe.chef = isSelfChef ? userDetails.nickname : newRecipe.chef;
    newRecipe.ingredients = ingredientsInputs.join(",");
    newRecipe.steps = stepsInputs.join(",");

    try {
      const response = await fetch(`${URL}/api/recipes`, {
        method: "POST",
        body: JSON.stringify(newRecipe),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to add recipe");
      }

      const data = await response.json();
      console.log(data);

      return data;
    } catch (error) {
      console.error("Error adding recipe:", error);
      throw error; // Rethrow the error for handling in the calling function
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      // Wait for addRecipe to complete
      await addRecipe();
      // Fetch the latest recipe after adding
      if (userDetails) {
        const response = await fetch(
          `${URL}/api/recipes/latest/${userDetails.id}`
        );
        const data = await response.json();
        setRecipeID(data.id);
        // Handle tag entry with the fetched recipeID
        if (selectedCategories.length > 0) {
          await handleTagEntry(categories, selectedCategories, data.id);
        }

        // Clear local storage after handling tags
        localStorage.removeItem("ingredientsInputs");
        localStorage.removeItem("stepsInputs");
        localStorage.removeItem("newRecipe");
        localStorage.removeItem("photo");
        localStorage.removeItem("selectedCategories");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleTextChange = (event, setNewRecipe, newRecipe) => {
    if (event.target.id === "chef" && isSelfChef) {
      setNewRecipe({
        ...newRecipe,
        chef: userDetails.nickname || userDetails.first_name,
      });
    } else {
      setNewRecipe({ ...newRecipe, [event.target.id]: event.target.value });
    }
  };

  const handleModalChoice = async (choice) => {
    setModalChoice(choice);
    try {
      if (choice === "yes") {
        await handleSubmit();
        navigate(`/family_cookbook`);
      } else {
        newRecipe.family = "defaultFamily";
        await handleSubmit();
        navigate(`/cookbook`);
      }
    } catch (error) {
      console.error("Error adding recipe:", error);
    }
    setShowModal(false);
  };

  // HANDLE PUBLIC TOGGLE
  const handlePublicToggleClick = () => {
    handlePublicToggle(isPublic, setIsPublic, newRecipe, setNewRecipe);
  };

  // Use Effect/GET request
  useEffect(() => {
    async function getUser() {
      const user = await getUserData();
      if (user) {
        setUserDetails(user);

        fetch(`${URL}/api/families`)
          .then((res) => res.json())
          .then((data) =>
            setFamilyName(
              data.find((f) => f.code === user.family_code)?.family_name
            )
          );
      }
    }

    fetch(`${URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((error) => console.error("Error fetching categories:", error));

    getUser();

    // Restore ingredientsInputs and stepsInputs from localStorage
    const storedIngredients =
      JSON.parse(localStorage.getItem("ingredientsInputs")) || [];
    console.log("storedIngredients", storedIngredients);
    const storedSteps = JSON.parse(localStorage.getItem("stepsInputs")) || [];
    console.log("storedSteps", storedSteps);
    const storedRecipe = JSON.parse(localStorage.getItem("newRecipe")) || [];
    console.log("storedRecipe", storedRecipe);
    const storedSelectedCategories =
      JSON.parse(localStorage.getItem("selectedCategories")) || [];
    console.log("storedSelectedCategories", storedSelectedCategories);
    setIngredientsInputs(storedIngredients);
    setStepsInputs(storedSteps);
    setNewRecipe(storedRecipe);
    setSelectedCategories(storedSelectedCategories);
  }, []);

  // This function is to use the speech recognition API and set up the method to handle the speech recognition
  const startRecognition = (callback, index) => {
    //You must first enable the speech recognition API in your browser
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";

    //This is to set the speech recognition to not show interim results. Just use the defaults https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/interimResults
    recognition.interimResults = false;
    //This is to set the speech recognition to only show one result. Just use the defaults from the docs https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/maxAlternatives
    recognition.maxAlternatives = 1;

    // Event handler for when the speech recognition starts. https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/start_event
    recognition.onstart = () => {
      setRecordingIndex(index);
    };

    // Event handler for when the speech recognition results are returned. https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/result_event
    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      callback(speechResult);
      setRecordingIndex(null);
    };

    // Event handler for when the speech recognition encounters an error. https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/error_event
    recognition.onerror = () => {
      setRecordingIndex(null);
    };

    // Event handler for when the speech recognition ends. https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/end_event
    recognition.onend = () => {
      setRecordingIndex(null);
    };

    recognition.start();
  };
  console.log("ingredientsInputs", ingredientsInputs);
  return (
    <div className="ml-28 border-2 border-black border-solid">
      <h1 className="text-center text-[#713A3A]">New Recipe</h1>
      <form onSubmit={handleSubmit}>
        {/* Dish Name Input */}
        <label>
          <h2>Name of dish</h2>
        </label>
        <div className="flex items-center space-x-2">
          <input
            id="name"
            value={newRecipe.name || ""}
            type="text"
            onChange={(event) =>
              handleTextChange(event, setNewRecipe, newRecipe)
            }
            className="shadow-md border-2 border-black hover:bg-white bg-zinc-100 rounded-lg py-2 px-3"
          />
          <button
            type="button"
            // This is to start the speech recognition. The function takes a callback function and an index. The callback function is to set the new recipe name to the text that is returned from the speech recognition. The index is to keep track of which input field is being used.
            onClick={() =>
              startRecognition(
                (text) => setNewRecipe({ ...newRecipe, name: text }),
                0
              )
            }
          >
            <Mic className="mt-8" />
          </button>
          {recordingIndex === 0 && <span>Recording...</span>}
        </div>

        {/* Chef Input */}
        <label>
          <h2>Chef</h2>
          <input
            type="checkbox"
            id="selfChef"
            checked={isSelfChef}
            onChange={() => setIsSelfChef(!isSelfChef)}
          />
          <span>Self</span>
        </label>
        <div className="flex items-center space-x-2">
          <input
            id="chef"
            value={
              isSelfChef
                ? capitalizeFirstLetter(userDetails?.nickname) ||
                  capitalizeFirstLetter(userDetails?.first_name)
                : capitalizeFirstLetter(newRecipe.chef) || ""
            }
            type="text"
            onChange={(event) =>
              handleTextChange(event, setNewRecipe, newRecipe)
            }
            className="shadow-md border-2 border-black hover:bg-white bg-zinc-100 rounded-lg py-2 px-3"
          />
          <button
            type="button"
            onClick={() =>
              // This is to start the speech recognition. The function takes a callback function and an index. The callback function is to set the new recipe chef to the text that is returned from the speech recognition. The index is to keep track of which input field is being used.
              startRecognition(
                (text) => setNewRecipe({ ...newRecipe, chef: text }),
                1
              )
            }
          >
            <Mic className="mt-8" />
          </button>
          {recordingIndex === 1 && <span>Recording...</span>}
        </div>

        {/* Ingredients Input */}
        <label>
          <h2>Ingredients</h2>
        </label>
        {ingredientsInputs.map((ingredientInput, index) => (
          <div key={index} className="flex items-center space-x-2">
            <input
              onChange={(e) =>
                handleIngredientsInputChange(
                  index,
                  e,
                  setIngredientsInputs,
                  ingredientsInputs
                )
              }
              type="text"
              value={ingredientInput || ""}
              className="border-solid border-2 border-black p-2 mt-8"
            />
            <button
              type="button"
              onClick={() =>
                // This is to start the speech recognition. The function takes a callback function and an index. The callback function adds the text that is returned from the speech recognition to the new ingredients array. The index is to keep track of which input field is being used.
                startRecognition((text) => {
                  const newIngredients = [...ingredientsInputs];
                  newIngredients[index] = text;
                  setIngredientsInputs(newIngredients);
                }, index + 2)
              }
            >
              <Mic className="mt-8" />
            </button>
            {recordingIndex === index + 2 && <span>Recording...</span>}
            {/* DELETE AN INGREDIENT */}
            <div
              onClick={() =>
                handleIngredientDelete(
                  index,
                  setIngredientsInputs,
                  ingredientsInputs
                )
              }
            >
              <X />
            </div>
          </div>
        ))}
        {/* PLUS BUTTON */}
        <div
          onClick={() =>
            handleAddIngredientsInput(setIngredientsInputs, ingredientsInputs)
          }
          className="ml-28 bg-zinc-100 text-black shadow-md border-2 border-black rounded-lg py-1 px-2 w-8 h-8 flex items-center justify-center"
        >
          <Plus />
        </div>

        {/* Steps Input */}
        <label>
          <h2>Steps</h2>
        </label>
        {stepsInputs.map((stepInput, index) => (
          <div key={index} className="flex items-center space-x-2 mt-8">
            <input
              onChange={(e) =>
                handleStepsInputChange(index, e, setStepsInputs, stepsInputs)
              }
              type="text"
              value={stepInput || ""}
              className="border-solid border-2 border-black p-2 mt-8"
            />
            <button
              type="button"
              // This is to start the speech recognition. The function takes a callback function and an index. The callback function adds the text that is returned from the speech recognition to the new steps array. The index is to keep track of which input field is being used.
              onClick={() =>
                startRecognition((text) => {
                  const newSteps = [...stepsInputs];
                  newSteps[index] = text;
                  setStepsInputs(newSteps);
                }, index + ingredientsInputs.length + 2)
              }
            >
              <Mic className="mt-8" />
            </button>
            {recordingIndex === index + ingredientsInputs.length + 2 && (
              <span>Recording...</span>
            )}
            {/* DELETE A STEP */}
            <div
              onClick={() =>
                handleStepDelete(index, setStepsInputs, stepsInputs)
              }
            >
              <X />
            </div>
          </div>
        ))}
        {/* PLUS BUTTON */}
        <div
          onClick={() => handleStepsInput(setStepsInputs, stepsInputs)}
          className="ml-28 bg-zinc-100 text-black shadow-md border-2 border-black rounded-lg py-1 px-2 w-8 h-8 flex items-center justify-center"
        >
          <Plus />
        </div>

        {/* CATEGORIES */}
        <div>
          {categories.length > 0 &&
            categories.map((category, index) => {
              const isSelected = selectedCategories.includes(
                category.category_name
              );
              return (
                <p
                  key={index}
                  onClick={() =>
                    handleTagClick(
                      category.category_name,
                      selectedCategories,
                      setSelectedCategories
                    )
                  }
                  className={`inline-block px-2 py-1 rounded-full ${
                    isSelected ? "bg-gray-200" : ""
                  }`}
                >
                  #{category.category_name}
                </p>
              );
            })}
        </div>
        <Link
          to="/dish_photo"
          onClick={() => {
            saveToLocalStorage();
          }}
        >
          <p className="text-center bg-[#BCB9B9] p-2 inline-block ml-4">
            Take a photo of your dish
          </p>
          <div className="flex justify-center items-center">
            <Camera className="w-8 h-8" />
          </div>
        </Link>

        {/* Public Toggle */}
        <div className="flex justify-center items-center mt-4">
          <span className="mr-3">{isPublic ? "Public" : "Private"}</span>
          <div
            onClick={handlePublicToggleClick}
            className={`w-16 h-8 flex items-center rounded-full p-1 cursor-pointer ${
              isPublic ? "bg-[#3A00E5]" : "bg-gray-300"
            }`}
          >
            <div
              className={`bg-white w-6 h-6 rounded-full shadow-md transform ${
                isPublic ? "translate-x-8" : ""
              } transition-transform duration-300`}
            />
          </div>
        </div>

        {/* Submit/Save Button */}
        <div className="flex justify-between mt-10">
          <input
            type="submit"
            value="Save"
            className="bg-emerald-500 hover:bg-green-500 rounded-lg px-1 py-0 shadow-md w-1/2 mb-10 ml-2"
          />
          <p
            onClick={() => navigate(-1)}
            className="bg-red-400 hover:bg-red-500 rounded-lg px-1 py-0 shadow-md w-1/2 mb-10 ml-2"
          >
            Cancel
          </p>
        </div>
      </form>

      {/* MODAL */}
      {showModal && (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-800 bg-opacity-75 z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg text-center">
            <p className="mb-3">
              Would you like to add this recipe to your family?
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => handleModalChoice("yes")}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded mr-2"
              >
                Yes
              </button>
              <button
                onClick={() => handleModalChoice("no")}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded ml-2"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecipeForm;
