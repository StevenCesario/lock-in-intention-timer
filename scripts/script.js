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