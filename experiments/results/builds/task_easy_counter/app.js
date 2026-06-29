import { getCount, saveCount } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
  const display = document.getElementById('counter-display');
  const btnIncrement = document.getElementById('btn-increment');
  const btnDecrement = document.getElementById('btn-decrement');

  let count = getCount();

  const updateDisplay = () => {
    display.textContent = count;
  };

  btnIncrement.addEventListener('click', () => {
    count++;
    saveCount(count);
    updateDisplay();
  });

  btnDecrement.addEventListener('click', () => {
    count--;
    saveCount(count);
    updateDisplay();
  });

  updateDisplay();
});