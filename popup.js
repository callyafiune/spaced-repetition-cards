import { generateId, truncateText, parseCSV } from './utils.js';

let countdownInterval = null;

// === INITIALIZATION ===

document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  initializeEventListeners();
  loadAllData();
});

function initializeTabs() {
  const menu = document.querySelector('.menu');
  menu.addEventListener('click', (e) => {
    const button = e.target.closest('.menu-btn');
    if (button) {
      const targetTab = button.dataset.tab;
      
      document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      button.classList.add('active');
      const contentTab = document.getElementById(`${targetTab}-tab`);
      if (contentTab) {
        contentTab.classList.add('active');
      }

      if (targetTab === 'manage') {
        loadAndDisplayCards();
        updateStats();
      }
    }
  });
}

function initializeEventListeners() {
  // Add Card Form
  document.getElementById('add-card-form').addEventListener('submit', handleAddCard);

  // Manage Cards Tab
  document.getElementById('search-cards').addEventListener('input', filterCards);
  document.getElementById('filter-category').addEventListener('change', filterCards);
  document.getElementById('cards-list').addEventListener('click', handleCardAction);

  // Settings Tab
  document.getElementById('enable-notifications').addEventListener('change', saveSettings);
  document.getElementById('interval-minutes').addEventListener('input', handleIntervalSlider);
  document.getElementById('interval-minutes').addEventListener('change', saveSettings);
  document.getElementById('cards-per-session').addEventListener('input', handleSessionSlider);
  document.getElementById('cards-per-session').addEventListener('change', saveSettings);

  document.getElementById('test-card').addEventListener('click', () => chrome.runtime.sendMessage({ action: 'getNextCard' }));
  
  // Data actions
  document.getElementById('import-csv').addEventListener('click', () => document.getElementById('import-csv-file').click());
  document.getElementById('import-csv-file').addEventListener('change', handleImportCSV);
  document.getElementById('export-data').addEventListener('click', exportData);
  document.getElementById('import-data').addEventListener('click', () => document.getElementById('import-file').click());
  document.getElementById('import-file').addEventListener('change', importData);
  document.getElementById('reset-data').addEventListener('click', resetData);
}

async function loadAllData() {
  await loadAndDisplayCards();
  await loadSettings();
  await updateStats();
  startCountdownTimer();
}

// === CARD MANAGEMENT ===

async function handleAddCard(e) {
  e.preventDefault();
  const form = e.target;
  const question = form.question.value.trim();
  const answer = form.answer.value.trim();
  const hint = form.hint.value.trim();
  const category = form.category.value.trim();

  if (!question || !answer) {
    showNotification('Pergunta e resposta são obrigatórias.', 'error');
    return;
  }

  const newCard = {
    id: generateId(),
    question,
    answer,
    hint,
    category: category || 'Geral',
    correctCount: 0,
    incorrectCount: 0,
    repetitions: 0,
    lastReviewed: null,
    nextReview: Date.now(),
    interval: 1,
    easeFactor: 2.5,
  };

  const { cards = [] } = await chrome.storage.local.get('cards');
  cards.push(newCard);
  await chrome.storage.local.set({ cards });
  
  form.reset();
  showNotification('Cartão adicionado com sucesso!', 'success');
  
  // Switch to manage tab to show the new card
  const manageButton = document.querySelector('.menu-btn[data-tab="manage"]');
  if(manageButton) manageButton.click();
}

async function loadAndDisplayCards() {
  const { cards = [] } = await chrome.storage.local.get('cards');
  displayCards(cards);
  updateCategoryFilter(cards);
}

function displayCards(cards) {
  const cardsList = document.getElementById('cards-list');
  const searchTerm = document.getElementById('search-cards').value.toLowerCase();
  const selectedCategory = document.getElementById('filter-category').value;

  const filteredCards = cards
    .filter(card => {
        const matchesSearch = card.question.toLowerCase().includes(searchTerm) || card.answer.toLowerCase().includes(searchTerm);
        const matchesCategory = !selectedCategory || card.category === selectedCategory;
        return matchesSearch && matchesCategory;
    })
    .sort((a, b) => (b.lastReviewed || 0) - (a.lastReviewed || 0)); // Show most recent first

  if (filteredCards.length === 0) {
    cardsList.innerHTML = `<div class="empty-state"><p>📝 Nenhum cartão encontrado</p><p>Adicione alguns cartões para começar a estudar!</p></div>`;
    return;
  }

  cardsList.innerHTML = filteredCards.map(card => {
    const nextReviewDate = new Date(card.nextReview || 0);
    const isDue = nextReviewDate <= new Date();
    const reviewDateString = isDue 
      ? 'Pronto para revisão' 
      : `Revisar em ${nextReviewDate.toLocaleDateString()}`;
    
    const questionText = card.question;
    const match = questionText.match(/^([\w\s-]+) — traduza para PT-BR/);
    const wordToSpeak = match ? match[1].trim() : null;

    let questionHTML;
    if (wordToSpeak) {
      questionHTML = `
        <div class="card-question-container">
          <p class="card-question">${truncateText(questionText, 50)}</p>
          <button class="btn-icon card-action-speak" data-word="${wordToSpeak}" title="Ouvir">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
          </button>
        </div>
      `;
    } else {
      questionHTML = `<p class="card-question">${truncateText(questionText, 60)}</p>`;
    }

    return `
      <div class="card-item" data-id="${card.id}">
        <div class="card-item-content">
          ${questionHTML}
          <p class="card-answer">${truncateText(card.answer, 70)}</p>
          <div class="card-meta">
            <span class="card-category">${card.category}</span>
            <span class="card-review-date ${isDue ? 'due' : ''}">${reviewDateString}</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn-icon card-action-edit" data-card-id="${card.id}" title="Editar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
          </button>
          <button class="btn-icon card-action-delete" data-card-id="${card.id}" title="Excluir">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" /></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function handleCardAction(e) {
  const button = e.target.closest('button');
  if (!button) return;

  if (button.classList.contains('card-action-speak')) {
    speakWord(button.dataset.word);
    return;
  }

  const cardId = button.dataset.cardId;
  if (!cardId) return;

  if (button.classList.contains('card-action-edit')) {
    renderEditForm(cardId);
  } else if (button.classList.contains('card-action-delete')) {
    deleteCard(cardId);
  } else if (button.classList.contains('card-action-save')) {
    saveEditedCard(cardId);
  } else if (button.classList.contains('card-action-cancel')) {
    loadAndDisplayCards();
  }
}

async function renderEditForm(cardId) {
    const { cards = [] } = await chrome.storage.local.get('cards');
    const card = cards.find(c => c.id.toString() === cardId);
    if (!card) return;

    const cardElement = document.querySelector(`.card-item[data-id="${cardId}"]`);
    cardElement.innerHTML = `
      <form class="edit-card-form">
        <textarea class="edit-question" placeholder="Pergunta">${card.question}</textarea>
        <textarea class="edit-answer" placeholder="Resposta">${card.answer}</textarea>
        <div class="card-actions">
          <button type="button" class="btn btn-secondary card-action-cancel" data-card-id="${cardId}">Cancelar</button>
          <button type="button" class="btn btn-primary card-action-save" data-card-id="${cardId}">Salvar</button>
        </div>
      </form>
    `;
    cardElement.querySelector('.edit-question').focus();
}

async function saveEditedCard(cardId) {
    const cardElement = document.querySelector(`.card-item[data-id="${cardId}"]`);
    const newQuestion = cardElement.querySelector('.edit-question').value.trim();
    const newAnswer = cardElement.querySelector('.edit-answer').value.trim();

    if (!newQuestion || !newAnswer) {
        showNotification('Pergunta e resposta não podem estar vazias.', 'error');
        return;
    }

    const { cards = [] } = await chrome.storage.local.get('cards');
    const cardIndex = cards.findIndex(c => c.id.toString() === cardId);
    if (cardIndex > -1) {
        cards[cardIndex].question = newQuestion;
        cards[cardIndex].answer = newAnswer;
        await chrome.storage.local.set({ cards });
        showNotification('Cartão atualizado!', 'success');
        loadAndDisplayCards();
    }
}

async function deleteCard(cardId) {
  if (!confirm('Tem certeza que deseja excluir este cartão?')) return;
  
  let { cards = [] } = await chrome.storage.local.get('cards');
  cards = cards.filter(card => card.id.toString() !== cardId);
  
  await chrome.storage.local.set({ cards });
  loadAndDisplayCards();
  updateStats();
  showNotification('Cartão excluído.', 'success');
}

function filterCards() {
  loadAndDisplayCards();
}

function updateCategoryFilter(cards) {
  const categories = [...new Set(cards.map(card => card.category).filter(Boolean))];
  const select = document.getElementById('filter-category');
  const currentValue = select.value;
  select.innerHTML = '<option value="">Todas as categorias</option>' +
    categories.sort().map(cat => `<option value="${cat}">${cat}</option>`).join('');
  select.value = currentValue;
}

async function updateStats() {
  const { cards = [] } = await chrome.storage.local.get('cards');
  const total = cards.length;
  const pending = cards.filter(card => !card.nextReview || card.nextReview <= Date.now()).length;
  const mastered = cards.filter(card => (card.repetitions || 0) >= 10).length; // Mastered after 10 correct in a row
  
  document.getElementById('total-cards').textContent = total;
  document.getElementById('pending-cards').textContent = pending;
  document.getElementById('mastered-cards').textContent = mastered;
}

// === SETTINGS & DATA I/O ===

async function loadSettings() {
  const { settings } = await chrome.storage.local.get({
    settings: { enabled: true, intervalMinutes: 1, cardsPerSession: 1 }
  });
  
  document.getElementById('enable-notifications').checked = settings.enabled;
  document.getElementById('interval-minutes').value = settings.intervalMinutes;
  document.getElementById('cards-per-session').value = settings.cardsPerSession;
  handleIntervalSlider();
  handleSessionSlider();
}

async function saveSettings() {
  const settings = {
    enabled: document.getElementById('enable-notifications').checked,
    intervalMinutes: parseInt(document.getElementById('interval-minutes').value, 10),
    cardsPerSession: parseInt(document.getElementById('cards-per-session').value, 10)
  };
  
  await chrome.storage.local.set({ settings });
  chrome.runtime.sendMessage({ action: 'settingsUpdated' });
  showNotification('Configurações salvas!', 'success');
  startCountdownTimer();
}

function handleIntervalSlider() {
  const value = document.getElementById('interval-minutes').value;
  document.getElementById('interval-display').textContent = `${value} minuto${value > 1 ? 's' : ''}`;
}

function handleSessionSlider() {
  const value = document.getElementById('cards-per-session').value;
  document.getElementById('session-display').textContent = `${value} cartão${value > 1 ? 's' : ''}`;
}

function speakWord(word) {
    if (word && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
    }
}

async function exportData() {
  const data = await chrome.storage.local.get(['cards', 'settings']);
  data.exportDate = new Date().toISOString();
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `revisao-espacada-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification('Dados exportados.', 'success');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.cards || !Array.isArray(data.cards)) throw new Error('Formato de arquivo inválido.');
      if (!confirm('Isso substituirá todos os seus dados atuais. Continuar?')) return;
      
      await chrome.storage.local.set({ cards: data.cards, settings: data.settings || {} });
      await loadAllData();
      showNotification('Dados importados com sucesso!', 'success');
    } catch (error) {
      showNotification(`Erro ao importar: ${error.message}`, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

async function handleImportCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const csvText = e.target.result;
            const newCardsData = parseCSV(csvText);
            if (newCardsData.length === 0) {
                showNotification('Nenhum cartão válido encontrado no CSV.', 'error');
                return;
            }

            const { cards: existingCards = [] } = await chrome.storage.local.get('cards');
            const existingQuestions = new Set(existingCards.map(c => c.question.toLowerCase().trim()));

            const uniqueNewCards = newCardsData
                .filter(c => !existingQuestions.has(c.question.toLowerCase().trim()))
                .map(c => ({ ...c, id: generateId(), correctCount: 0, incorrectCount: 0, repetitions: 0, lastReviewed: null, nextReview: Date.now(), interval: 1, easeFactor: 2.5 }));

            const allCards = [...existingCards, ...uniqueNewCards];
            await chrome.storage.local.set({ cards: allCards });

            const message = `${uniqueNewCards.length} novos cartões importados. ${newCardsData.length - uniqueNewCards.length} duplicados ignorados.`;
            showNotification(message, 'success');
            await loadAllData();
        } catch (error) {
            showNotification(`Erro ao processar CSV: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

async function resetData() {
  if (!confirm('TEM CERTEZA? Todos os seus cartões e estatísticas serão apagados permanentemente.')) return;
  
  await chrome.storage.local.clear();
  await loadAllData();
  showNotification('Todos os dados foram apagados.', 'success');
}

// === UI HELPERS ===

function showNotification(message, type = 'success') {
  const notificationId = `notification-${Date.now()}`;
  const notification = document.createElement('div');
  notification.id = notificationId;
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  // Position notifications in the top right corner of the popup body
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 9999;
    transform: translateX(120%);
    opacity: 0;
    transition: transform 0.3s ease, opacity 0.3s ease;
    background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
    notification.style.opacity = '1';
  }, 10);
  
  // Animate out and remove
  setTimeout(() => {
    notification.style.transform = 'translateX(120%)';
    notification.style.opacity = '0';
    notification.addEventListener('transitionend', () => notification.remove());
  }, 3000);
}

// === COUNTDOWN TIMER ===

function startCountdownTimer() {
  if (countdownInterval) clearInterval(countdownInterval);
  updateCountdownDisplay();
  countdownInterval = setInterval(updateCountdownDisplay, 1000);
}

async function updateCountdownDisplay() {
  const timerElement = document.getElementById('countdown-timer');
  if(!timerElement) return;

  const { settings } = await chrome.storage.local.get('settings');
  if (!settings?.enabled) {
    timerElement.textContent = 'Desativado';
    timerElement.style.color = 'var(--text-secondary)';
    return;
  }

  const alarm = await chrome.alarms.get('showCard');
  if (alarm?.scheduledTime) {
    const timeRemaining = alarm.scheduledTime - Date.now();
    if (timeRemaining > 0) {
      const minutes = Math.floor(timeRemaining / 60000);
      const seconds = Math.floor((timeRemaining % 60000) / 1000);
      timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      timerElement.style.color = 'var(--primary-accent)';
    } else {
      timerElement.textContent = '00:00';
      timerElement.style.color = 'var(--danger)';
    }
  } else {
    timerElement.textContent = '--:--';
    timerElement.style.color = 'var(--text-secondary)';
  }
}