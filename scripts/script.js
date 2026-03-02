// DOM POINTERS
const timeDisplay = document.getElementById('time-display');
const startBtn = document.getElementById('start-btn');

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

// INITIALIZATION
// When the script first runs, make sure the DOM matches our State
ViewRenderer.updateDisplay();

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

        // 3. The "Heartbeat" using setInterval
        StateBuffer.intervalId = setInterval(() => {
            StateBuffer.totalSeconds--;
            ViewRenderer.updateDisplay();

            // Our Stop condition
            if (StateBuffer.totalSeconds <= 0) {
                this.stop();
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
    }
};