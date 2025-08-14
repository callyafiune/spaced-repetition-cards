// background.js - Service Worker
import { parseCSV, generateId } from './utils.js';

// === Main Setup ===

// Run on install or update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Spaced Repetition Extension installed/updated.');
  await setupInitialData();
  await setupAlarms();

  if (details.reason === 'install') {
    // Show a card shortly after installation for a good first run experience
    setTimeout(() => showNextCard(), 3000);
  }
});

// Run on browser startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started. Setting up alarms.');
  setupAlarms();
});


// === Core Functions ===

/**
 * Sets up initial settings and default cards if they don't exist.
 */
async function setupInitialData() {
  const { settings, cards } = await chrome.storage.local.get(['settings', 'cards']);

  if (!settings) {
    const defaultSettings = {
      enabled: true,
      intervalMinutes: 1,
      cardsPerSession: 1
    };
    await chrome.storage.local.set({ settings: defaultSettings });
  }

  if (!cards || cards.length === 0) {
    await loadDefaultCards();
  }
}

/**
 * Clears any existing alarm and sets a new one based on user settings.
 */
async function setupAlarms() {
  const { settings } = await chrome.storage.local.get(['settings']);
  await chrome.alarms.clear('showCard');
  if (settings?.enabled) {
    chrome.alarms.create('showCard', {
      delayInMinutes: settings.intervalMinutes,
      periodInMinutes: settings.intervalMinutes
    });
    console.log(`Alarm set. Next card in ${settings.intervalMinutes} minute(s).`);
  }
}

/**
 * Loads cards from the default CSV file into storage.
 */
async function loadDefaultCards() {
  try {
    const response = await fetch(chrome.runtime.getURL('vocabulario.csv'));
    if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    
    const csvText = await response.text();
    const parsedCards = parseCSV(csvText);

    const cards = parsedCards.map(c => ({
      ...c,
      id: generateId(),
      correctCount: 0,
      incorrectCount: 0,
      streak: 0,
      lastReviewed: null,
      nextReview: Date.now(),
      interval: 1, // in days
      easeFactor: 2.5,
    }));

    await chrome.storage.local.set({ cards, csvLoaded: true });
    console.log(`${cards.length} cards loaded from CSV.`);
  } catch (error) {
    console.error('Error loading default cards:', error);
    await chrome.storage.local.set({ cards: [] });
  }
}

/**
 * Selects the next card to review and displays it on the active tab.
 */
async function showNextCard() {
  try {
    const { cards, settings } = await chrome.storage.local.get(['cards', 'settings']);
    
    if (!settings?.enabled || !cards || cards.length === 0) {
      return;
    }

    const now = Date.now();
    const cardsToReview = cards.filter(card => !card.nextReview || card.nextReview <= now);

    if (cardsToReview.length === 0) {
      return;
    }

    const selectedCard = selectCardBySpacedRepetition(cardsToReview);

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!activeTab?.id || activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
      return;
    }

    // Programmatically inject scripts and styles to avoid manifest issues and ensure they are always loaded.
    await chrome.scripting.insertCSS({ target: { tabId: activeTab.id }, files: ['styles.css'] });
    await chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files: ['content.js'] });
    
    // Wait a moment for the content script to be ready to receive messages.
    await new Promise(resolve => setTimeout(resolve, 100));

    await chrome.tabs.sendMessage(activeTab.id, { action: 'showCard', card: selectedCard });

  } catch (error) {
    // This can happen if the tab is a special page (e.g., chrome web store) where scripting is not allowed.
    console.warn(`Could not show card on active tab: ${error.message}`);
  }
}


// === Spaced Repetition Logic ===

/**
 * Selects the best card to review from a list of due cards.
 * Prioritizes cards that are most overdue and have a higher error rate.
 * @param {Array<object>} cardsToReview - The list of cards due for review.
 * @returns {object} The selected card.
 */
function selectCardBySpacedRepetition(cardsToReview) {
  const now = Date.now();
  cardsToReview.sort((a, b) => {
    const scoreA = (now - (a.nextReview || 0)) * (1 + (a.incorrectCount || 0) / ((a.correctCount || 0) + 1));
    const scoreB = (now - (b.nextReview || 0)) * (1 + (b.incorrectCount || 0) / ((b.correctCount || 0) + 1));
    return scoreB - scoreA;
  });
  return cardsToReview[0];
}

/**
 * Updates a card's statistics and schedules its next review based on user's answer.
 * Uses a simplified SM-2 (spaced repetition) algorithm.
 * @param {string|number} cardId - The ID of the card to update.
 * @param {boolean} isCorrect - Whether the user answered correctly.
 */
async function updateCardStats(cardId, isCorrect) {
  const { cards } = await chrome.storage.local.get(['cards']);
  if (!cards) return;
  
  const cardIndex = cards.findIndex(c => c.id.toString() === cardId.toString());
  if (cardIndex === -1) return;

  const card = cards[cardIndex];
  card.lastReviewed = Date.now();

  if (isCorrect) {
    card.correctCount = (card.correctCount || 0) + 1;
    card.streak = (card.streak || 0) + 1;
    card.easeFactor = (card.easeFactor || 2.5) + 0.1;
    
    if (card.streak === 1) {
      card.interval = 1; // 1 day
    } else if (card.streak === 2) {
      card.interval = 6; // 6 days
    } else {
      card.interval = Math.ceil((card.interval || 1) * card.easeFactor);
    }
    card.nextReview = Date.now() + card.interval * 24 * 60 * 60 * 1000;
  } else {
    card.incorrectCount = (card.incorrectCount || 0) + 1;
    card.streak = 0; // Reset streak
    card.easeFactor = Math.max(1.3, (card.easeFactor || 2.5) - 0.2);
    card.interval = 1; // Reset interval
    // Show again soon for re-learning
    card.nextReview = Date.now() + 10 * 60 * 1000; // 10 minutes
  }
  
  cards[cardIndex] = card;
  await chrome.storage.local.set({ cards });
}


// === Event Listeners ===

// Listen for the alarm to show a card
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'showCard') {
    showNextCard();
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.action) {
      case 'updateCard':
        await updateCardStats(message.cardId, message.correct);
        await setupAlarms(); // Restart alarm timer after interaction
        sendResponse({ success: true });
        break;
      case 'getNextCard':
        await showNextCard();
        sendResponse({ success: true });
        break;
      case 'settingsUpdated':
        await setupAlarms();
        sendResponse({ success: true });
        break;
    }
  })();
  return true; // Keep message channel open for async response
});
