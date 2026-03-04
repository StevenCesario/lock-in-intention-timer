// DOM POINTERS
const timeDisplay = document.getElementById('time-display');
const startBtn = document.getElementById('start-btn');
const intentionInput = document.getElementById('intention-input');
const intentionPrompt = document.getElementById('intention-prompt');
const intentionActive = document.getElementById('intention-active');

// STATE BUFFER (Our Source of Truth)
// Time is stored purely as an integer representing seconds. Raw, primitive data
const StateBuffer = {
    totalSeconds: 0,
    isRunning: false,
    intervalId: null,
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
        const rawText = timeDisplay.textContent;
        StateBuffer.totalSeconds = TimeParser.parseToSeconds(rawText);

        // Safety check: Don't start a zero-second timer
        if (StateBuffer.totalSeconds <= 0) return;

        // 2. Lock the buffer! We don't want the user to be able to edit anything 
        // while the timer is running
        timeDisplay.setAttribute("contenteditable", "false");
        StateBuffer.isRunning = true;
        startBtn.textContent = "Pause";

        // UPDATE: Lock the text input field!
        intentionInput.disabled = true;

        // UPDATE: Swap the intention prompts
        intentionPrompt.hidden = true;
        intentionActive.hidden = false;

        // 3. The "Heartbeat" using setInterval
        StateBuffer.intervalId = setInterval(() => {
            StateBuffer.totalSeconds--;
            ViewRenderer.updateDisplay();

            // UPDATE: Store current second primitive in localStorage!
            StorageManager.save_seconds(StateBuffer.totalSeconds);

            // Our Stop condition
            if (StateBuffer.totalSeconds <= 0) {
                this.stop();

                // UPDATE: Clear localStorage
                StorageManager.clear_seconds();
            }
        }, 1000);
    },

    stop() {
        // Halt the Browser API from sending more tasks to the Task Queue
        clearInterval(StateBuffer.intervalId);
        StateBuffer.intervalId = null;
        StateBuffer.isRunning = false;

        // Unlock the buffer again and reset the button
        timeDisplay.setAttribute("contenteditable", "true");
        startBtn.textContent = "Lock In";

        // UPDATE: Ensure we save the exact amount of seconds in localStorage
        StorageManager.save_seconds(StateBuffer.totalSeconds);
    }
};

// LOCALSTORAGE
// Helper object to handle the string <-> integer conversion
// UPDATE: Now also handles the key for the user intention
const StorageManager = {
    // UPDATE: One localStorage key for the seconds, one for the intention
    SECONDS_KEY: "focus_timer_seconds",
    INTENTION_KEY: "focus_timer_intention",

    save_seconds(seconds) {
        localStorage.setItem(this.SECONDS_KEY, seconds.toString());
    },

    load_seconds() {
        const storageSeconds = localStorage.getItem(this.SECONDS_KEY);
        // If data exists, parse it to an integer. If not, return null
        return storageSeconds ? parseInt(storageSeconds, 10) : null;
    },

    clear_seconds() {
        localStorage.removeItem(this.SECONDS_KEY);
    },

    save_intention(intention) {
        localStorage.setItem(this.INTENTION_KEY, intention); // intention is already a string
    },

    load_intention() {
        const storageIntention = localStorage.getItem(this.INTENTION_KEY);
        return storageIntention ? storageIntention : null;
    },

    clear_intention() {
        localStorage.removeItem(this.INTENTION_KEY);
    },
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


// CLICK EVENT
startBtn.addEventListener('click', () => {
    if (StateBuffer.isRunning) {
        TimerEngine.stop();
    } else {
        TimerEngine.start();
    }
});

// INITIALIZATION
// Now updated to check localStorage before anything
const localStorageSeconds = StorageManager.load_seconds();

if (localStorageSeconds !== null) {
    // If it's not null, it means that there is seconds saved. Update the StateBuffer to use it!
    StateBuffer.totalSeconds = localStorageSeconds;
} else {
    // Start with the 45:00 from the HTML that we had earlier
    const rawText = timeDisplay.textContent;
    StateBuffer.totalSeconds = TimeParser.parseToSeconds(rawText);
}

// Ensure the View matches our Source of Truth
ViewRenderer.updateDisplay();