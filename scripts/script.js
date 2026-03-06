// DOM POINTERS
const timeDisplay = document.getElementById('time-display');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const intentionInput = document.getElementById('intention-input');
const intentionPrompt = document.getElementById('intention-prompt');
const intentionActive = document.getElementById('intention-active');
const intentionEnd = document.getElementById('intention-end');
const errorMessage = document.getElementById('error-message');

// STATE BUFFER (Our Source of Truth)
// Time is stored purely as an integer representing seconds. Raw, primitive data
const StateBuffer = {
    totalSeconds: 0,
    isRunning: false,
    intervalId: null,
    intentionEndScreen: false,
}

// VIEW RENDERER (Our "Mirror")
const ViewRenderer = {
    // Helper method to format raw seconds into "MM:SS"
    formatTime(seconds) {
        // Math.floor chops off any decimals to give us whole minutes
        const m = Math.floor(seconds / 60);

        // And modulo gives us the remining seconds after dividing by 60
        const s = seconds % 60;

        // Convert the numbers to strings and pad them to guarantee 2 characters
        // Same method that I used in Vibe Salad!
        const formattedMinutes = String(m).padStart(2, '0');
        const formattedSeconds = String(s).padStart(2, '0');

        return `${formattedMinutes}:${formattedSeconds}`;
    },

    // Push the new state to the DOM
    updateDisplay() {
        timeDisplay.textContent = this.formatTime(StateBuffer.totalSeconds);
    }
}

// VALIDATOR
const Validator = {
    // Rule: At least 3 characters for now. Will very most likely be updated!
    validateIntention(intention) {
        const cleanIntention = intention.trim();

        const intentionRegex = /^.{3,}$/;
        if (!intentionRegex.test(cleanIntention)) {
            return "Please enter a valid intention";
        }
        return null; // No error
    },

    // Rule: ?
    validateDigits(digits) {
        // To be added
        return null;
    },

    // A helper to check both at once
    validateInput(digits, intention) {
        const digitsError = this.validateDigits(digits);
        if (digitsError) return digitsError;

        const intentionError = this.validateIntention(intention);
        if (intentionError) return intentionError;

        return null; // Both are valid!
    }
}

// AUDIO ENGINE
const AudioEngine = {
    playDing() {
        // Create an AudioContext (The 'Foreign Office' for sound)
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create an oscillator (The sound generator)
        const oscillator = audioCtx.createOscillator();
        
        // Create a gain node (The volume control)
        const gainNode = audioCtx.createGain();

        // Connect the nodes: Oscillator -> Volume -> Speakers
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // Configure the sound
        oscillator.type = 'sine'; // A smooth, clean tone
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz = A5 note

        // Configure the volume envelope (Fade out smoothly over 1 second)
        gainNode.gain.setValueAtTime(0.6, audioCtx.currentTime); // Start at full volume
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1); // Fade to near silence

        // Play the sound
        oscillator.start(audioCtx.currentTime);
        // Stop the oscillator after the fade-out is complete
        oscillator.stop(audioCtx.currentTime + 1); 
    }
};

// TIME PARSER (DOM String -> Primitive Integer)
const TimeParser = {
    parseToSeconds(timeString) {
        // Strip out any accidental spaces
        const cleanString = timeString.trim();
        // Split the string to an array at the colon
        const parts = cleanString.split(":");

        if (parts.length === 2) {
            // Base 10 parsing
            const minutes = parseInt(parts[0], 10) || 0;
            const seconds = parseInt(parts[1], 10) || 0;
            return (minutes * 60) + seconds;
        } else {
            // Fallback: If they just type "45" without a colon, assume minutes
            const minutes = parseInt(parts[0], 10) || 0;
            return minutes * 60;
        }
    }
};

// EVENT LOOP
const TimerEngine = {
    start() {
        // 1. Scrape the current string from the DOM and update our Source of Truth
        const rawDigits = timeDisplay.textContent;

        // TODO: Validate the raw input digits before updating the StateBuffer
        StateBuffer.totalSeconds = TimeParser.parseToSeconds(rawDigits);

        // Safety check: Don't start a zero-second timer
        if (StateBuffer.totalSeconds <= 0) return; // To be moved to Validator?

        // UPDATE: Also scrape the Intention input field! And validate it with our new Validator
        const rawIntention = intentionInput.value;
        const validatedIntention = Validator.validateIntention(rawIntention);

        // I'd like to believe that we can mash all validation here
        if (validatedIntention !== null) {
            errorMessage.classList.toggle('invisible');
            errorMessage.textContent = validatedIntention;
            return;
        } 

        // 2. Lock the buffer! We don't want the user to be able to edit anything 
        // while the timer is running
        timeDisplay.setAttribute("contenteditable", "false");
        StateBuffer.isRunning = true;
        startBtn.textContent = "Pause";

        // UPDATE: Lock the text input field!
        intentionInput.disabled = true;

        // UPDATE: Show the Reset button! Now using the invisible class rather than the hidden property
        resetBtn.classList.toggle('invisible');

        // UPDATE: Swap the intention prompts
        intentionPrompt.hidden = true;
        intentionActive.hidden = false;

        // UPDATE: Hide and reset the error message
        errorMessage.classList.toggle('invisible');
        errorMessage.textContent = '';

        // 3. The "Heartbeat" using setInterval
        StateBuffer.intervalId = setInterval(() => {
            StateBuffer.totalSeconds--;
            ViewRenderer.updateDisplay();

            // UPDATE: Store current second primitive in localStorage!
            StorageManager.save(StorageManager.SECONDS_KEY, StateBuffer.totalSeconds);

            // Our Stop condition
            if (StateBuffer.totalSeconds <= 0) {
                this.haltBrowserAPI();

                // Swap the intention prompts from active to end
                intentionActive.hidden = true;
                intentionEnd.hidden = false;

                // The "Lock In" button should say "Set new intention"
                startBtn.textContent = "Set New Intention";

                // Hide the Reset button
                resetBtn.classList.toggle('invisible');

                // Use our new intentionEndScreen bool in StateBuffer!
                StateBuffer.intentionEndScreen = true;

                // Clear localStorage
                StorageManager.clearSession();

                // NEW: Play the completion sound!
                AudioEngine.playDing();
            }
        }, 1000);
    },

    pause() {
        this.haltBrowserAPI();

        // UPDATE: Refined Pause button behavior. No editing and "Continue" as the new text
        startBtn.textContent = "Continue";

        // UPDATE: Ensure we save the exact amount of seconds in localStorage
        StorageManager.save(StorageManager.SECONDS_KEY, StateBuffer.totalSeconds);
    },

    reset() {
        this.haltBrowserAPI();
        StorageManager.clearSession();
        
        // Manual full DOM reset
        timeDisplay.textContent = "45:00";
        StateBuffer.totalSeconds = 2700;
        timeDisplay.setAttribute("contenteditable", "true");
        intentionInput.value = "";
        intentionInput.disabled = false;
        intentionPrompt.hidden = false;
        intentionActive.hidden = true;
        intentionEnd.hidden = true;
        resetBtn.classList.toggle('invisible'); // UPDATE: Use invisible class instead of hidden property
        startBtn.textContent = "Lock In";
    },

    haltBrowserAPI() {
        // Halt the Browser API from sending more tasks to the Task Queue
        clearInterval(StateBuffer.intervalId);
        StateBuffer.intervalId = null;
        StateBuffer.isRunning = false;
    }
};

// LOCALSTORAGE
// Helper object to handle the string <-> integer conversion
// UPDATE: Now also handles the key for the user intention
const StorageManager = {
    // UPDATE: One localStorage key for the seconds, one for the intention
    SECONDS_KEY: "focus_timer_seconds",
    INTENTION_KEY: "focus_timer_intention",

    // Generic DRY methods
    save(key, value) {
        // Values must be strings in localStorage
        localStorage.setItem(key, String(value));
    },

    load(key) {
        return localStorage.getItem(key);
    },

    clear(key) {
        localStorage.removeItem(key);
    },

    // A pragmatic helper to wipe the whole session at once
    clearSession() {
        this.clear(this.SECONDS_KEY);
        this.clear(this.INTENTION_KEY);
    }
};

// INPUT "FIREWALL"
timeDisplay.addEventListener('keydown', (e) => {
    // We want to still allow "control" keys. Without these, the user wouldn't be able 
    // to fix any potentional mistakes
    const isControlKey = [
        'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'
    ].includes(e.key);

    // Allow numeric keys (0-9) using simple Regex
    const isNumber = /^[0-9]$/.test(e.key);

    // We need to allow the colon
    const isColon = e.key === ':';

    // Our rule: If it's NOT a number, NOT a control key, and NOT a colon...
    if (!isNumber && !isControlKey && !isColon) {
        // ...prevent it from even reaching the DOM
        e.preventDefault();
    }

    // Special case: If they hit "Enter", we want to stop editing
    if (e.key === 'Enter') {
        e.preventDefault(); // Stop Enter's default behavior of creating a new line. I didn't even realize this was a problem yesterday!
        timeDisplay.blur(); // Remove focus from the element
    }
});


// CLICK EVENTS
startBtn.addEventListener('click', () => {
    if (StateBuffer.isRunning) {
        TimerEngine.pause();
    } else {
        // UPDATE: First check! Are we at the intentionEndScreen?
        if (StateBuffer.intentionEndScreen) {
            // Use the now-isolated reset method!
            TimerEngine.reset();

            // Forgot this. Also set intentionEndScreen back to false!
            StateBuffer.intentionEndScreen = false;
        } else {
            TimerEngine.start();
    
            // UPDATE: Store the user intention in localStorage!
            StorageManager.save(StorageManager.INTENTION_KEY, intentionInput.value.trim());
        }
    }
});

resetBtn.addEventListener('click', () => {
    if(confirm("Are you sure you want to completely reset the timer?")) {
        TimerEngine.reset();
    }
});

// INITIALIZATION
// Now updated to check localStorage before anything
const localStorageSeconds = StorageManager.load(StorageManager.SECONDS_KEY);
const localStorageIntention = StorageManager.load(StorageManager.INTENTION_KEY);

if (localStorageSeconds !== null) {
    // If it's not null, it means that there is seconds saved. Update the StateBuffer to use it!
    StateBuffer.totalSeconds = localStorageSeconds;
} else {
    // Start with the 45:00 from the HTML that we had earlier
    const rawDigits = timeDisplay.textContent;
    StateBuffer.totalSeconds = TimeParser.parseToSeconds(rawDigits);
}

if (localStorageIntention !== null) {
    // Don't show the intention promp, show the Good Luck message immediately!
    intentionPrompt.hidden = true;
    intentionActive.hidden = false;

    // Show the locked intention that is stored in localStorage!
    intentionInput.value = localStorageIntention;
    intentionInput.disabled = true;
}

// Ensure the View matches our Source of Truth
ViewRenderer.updateDisplay();