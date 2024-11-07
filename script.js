document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    let learnedWords = new Set(JSON.parse(localStorage.getItem('learnedWords') || '[]'));
    let allWords = [];
    let flippedWords = [];
    let availableWords = [];
    let randomWord = null;
    let isFlipped = false; // New variable to track the current order
    let totalWords = 0; // Initialize totalWords
  
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.getElementById('progress-text');
  
    const generateButton = document.getElementById('generate-button');
    const wordContainer = document.getElementById('word-container'); // Ensure this is defined
    const showAnswerButton = document.getElementById('show-answer-button');
    const answerContainer = document.getElementById('answer-container'); // Ensure this is defined
    const learnedButton = document.getElementById('learned-button');
    const resetButton = document.getElementById('reset-button');
    const flipOrderButton = document.getElementById('flip-order-button');
    const infoButton = document.getElementById('info-button'); // Ensure this is defined
    const explanationContainer = document.getElementById('explanation-container'); // Ensure this is defined
  
    // Array to keep track of the main buttons
    const mainButtons = [generateButton, showAnswerButton, learnedButton];
  
    function updateProgress() {
      const learnedCount = learnedWords.size; // This should be correct
      const progressPercentage = (learnedCount / totalWords) * 100; // Ensure totalWords is accurate
      progressBar.style.width = `${progressPercentage}%`;
      progressText.textContent = `${learnedCount} / ${totalWords} words learned`;
    }
  
    function generateRandomWord() {
      if (availableWords.length === 0) {
        wordContainer.textContent = "All words learned!";
        answerContainer.textContent = ''; // Clear the answer when all words are learned
        randomWord = null;
        return;
      }
  
      const randomIndex = Math.floor(Math.random() * availableWords.length);
      randomWord = availableWords[randomIndex];
      wordContainer.textContent = isFlipped ? randomWord.translation : randomWord.word;
      answerContainer.textContent = '';
  
      // New lines to reset explanation and enable info button
      explanationContainer.textContent = ''; // Clear previous explanation
      explanationContainer.style.display = 'none'; // Hide explanation container
      infoButton.disabled = false; // Enable the info button
      infoButton.style.display = 'inline'; // Ensure the info button is visible again
  
      // Reset the info button text to the emoji
      infoButton.innerHTML = 'ℹ️'; // Set back to the emoji
    }
  
    generateButton.addEventListener('click', generateRandomWord);
  
    showAnswerButton.addEventListener('click', () => {
      if (randomWord) {
        const answer = isFlipped ? randomWord.word : randomWord.translation;
        answerContainer.textContent = answer.replace(/^-\s*/, ''); // Remove leading hyphen and any following spaces
      }
    });
  
    learnedButton.addEventListener('click', () => {
      if (randomWord && !learnedWords.has(randomWord.word)) {
        learnedWords.add(randomWord.word);
        localStorage.setItem('learnedWords', JSON.stringify(Array.from(learnedWords)));
        availableWords = availableWords.filter(word => word.word !== randomWord.word);
        updateProgress();
        generateRandomWord();
      }
    });
  
    resetButton.addEventListener('click', () => {
      learnedWords.clear();
      localStorage.removeItem('learnedWords');
      isFlipped = false; // Reset to normal order
      availableWords = [...allWords];
      updateProgress();
      generateRandomWord();
    });
  
    flipOrderButton.addEventListener('click', () => {
      // Clear learned words
      learnedWords.clear();
      localStorage.removeItem('learnedWords');
  
      // Toggle between normal and flipped order
      isFlipped = !isFlipped;
      availableWords = isFlipped ? [...flippedWords] : [...allWords];
  
      // Update progress display
      updateProgress();
  
      // Generate a new random word
      generateRandomWord();
  
      // Update button text
      flipOrderButton.textContent = isFlipped ? 'Normal Order' : 'Flip Order';
    });
  
    // Add event listeners for arrow keys
    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const currentIndex = mainButtons.indexOf(document.activeElement);
        let newIndex;
  
        if (event.key === 'ArrowUp') {
          newIndex = (currentIndex - 1 + mainButtons.length) % mainButtons.length;
        } else {
          newIndex = (currentIndex + 1) % mainButtons.length;
        }
  
        mainButtons[newIndex].focus();
      }
    });
  
    // Ensure the first button is focused on page load
    generateButton.focus();
  
    // Fetch words from JSON
    fetch('words.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
      })
      .then(data => {
        allWords = data.normalOrder;
        flippedWords = data.flippedOrder;
        totalWords = allWords.length; // Ensure this reflects the correct number of words
        availableWords = allWords.filter(word => !learnedWords.has(word.word));
        updateProgress();
        generateRandomWord();
      })
      .catch(error => console.error('Error loading words:', error));
  
    // Modify the fetchExplanation function
    async function fetchExplanation(word, meaning) {
      const explanationChunks = [];
      
      try {
        const stream = await window.inference.textGenerationStream({
          model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
          inputs: `Explain the meaning of the Tagalog word "${word}" concisely in English. Within your response, be sure to include the phrase: /"The Tagalog word ${word} literally means..."/ , /"Some emojis can be used to represent ${word} in a sentence."/ , /"It comes from the root word..."/"(if ${word} doesn't have an obvious root word, just say so). If ${word} is a longer word, describe the purpose of any affixes that are used. Don't forget to include a hyper-brief explanation of ${word}'s common usage or context. Limit your response to 2-3 short sentences and 60 words maximum.`,
          parameters: {
            max_new_tokens: 100,
            return_full_text: false,
            temperature: 0.5,
            top_p: 0.7,
          },
        });
  
        for await (const chunk of stream) {
          const content = chunk.token.text || "";
          explanationChunks.push(content);
          // Update the explanation container in real-time
          explanationContainer.textContent += content;
        }
      } catch (error) {
        console.error('Error fetching explanation:', error);
        throw error;
      }
  
      // Join the explanation chunks and remove any trailing </s> tags
      const explanation = explanationChunks.join('').replace(/<\/s>$/, '').trim();
      
      // Set the cleaned explanation to the container
      explanationContainer.textContent = explanation; // Ensure only the cleaned explanation is displayed
      return explanation; // Return the cleaned explanation if needed
    }
  
    // Modify the info button event listener
    infoButton.addEventListener('click', async () => {
      if (randomWord) {
        try {
          // infoButton.disabled = true; // Commented out to prevent button from disappearing
          infoButton.textContent = '...'; // Change text to indicate loading
          explanationContainer.textContent = ''; // Clear previous explanation
          explanationContainer.style.display = 'block';
          
          await fetchExplanation(randomWord.word, randomWord.translation);
        } catch (error) {
          console.error('Error fetching explanation:', error);
          explanationContainer.textContent = 'Failed to load explanation. Please try again.';
        } finally {
          // infoButton.disabled = false; // Commented out to keep button enabled
          infoButton.textContent = '🧠'; // Reset text after loading
          infoButton.style.display = 'none'; // Hide the info button after loading explanation
        }
      }
    });
  
    function toggleTheme() {
      const root = document.documentElement;
      const themeToggleButton = document.querySelector('.theme-toggle');

      // Get the current background color of the container
      const currentBackground = getComputedStyle(root).getPropertyValue('--background').trim();

      if (currentBackground === 'rgb(30, 30, 30)') { // Dark mode (1E1E1E in RGB)
        // Switch to normal mode
        root.style.setProperty('--background', '#FFFFFF'); // Light background for container
        root.style.setProperty('--text-color', '#000000'); // Dark text color
        root.style.setProperty('--button-bg', '#F0F0F0'); // Button background for normal mode
        root.style.setProperty('--button-hover-bg', '#D0D0D0'); // Button hover background
        themeToggleButton.textContent = '☀️'; // Change to sun emoji for normal mode
      } else {
        // Switch to dark mode
        root.style.setProperty('--background', 'rgb(30, 30, 30)'); // Dark background for container
        root.style.setProperty('--text-color', '#E0E0E0'); // Light text color
        root.style.setProperty('--button-bg', '#1E1E1E'); // Button background for dark mode
        root.style.setProperty('--button-hover-bg', '#333333'); // Button hover background
        themeToggleButton.textContent = '🌙'; // Change to moon emoji for dark mode
      }
    }   
    function toggleTheme() {
        const root = document.documentElement;
        const themeToggleButton = document.querySelector('.theme-toggle');
        const body = document.body;

        // Set the theme to normal mode on initial load
        root.style.setProperty('--background', '#FFFFFF'); // Light background for container
        root.style.setProperty('--text-color', '#000000'); // Dark text color
        root.style.setProperty('--button-bg', 'var(--button-normal-bg)'); // Button background for normal mode
        root.style.setProperty('--button-hover-bg', 'var(--button-normal-hover-bg'); // Button hover background
        themeToggleButton.textContent = '☀️'; // Change to sun emoji for normal mode
        body.setAttribute('data-theme', 'normal'); // Set data-theme to normal
    }

    // Ensure the theme is set to normal mode on page load
    toggleTheme(); // Call toggleTheme to set the initial theme
  });
