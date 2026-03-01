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