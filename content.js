// Content script to display study cards on the page

// Use a property on the window object to ensure this script only runs once per page.
// Content scripts run in an isolated world, so this `window` is safe from page scripts.
if (typeof window.spacedRepetitionScriptInjected === 'undefined') {
  window.spacedRepetitionScriptInjected = true;

  let currentCard = null;
  let cardElement = null;
  let isCardVisible = false;

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'showCard') {
      // Avoid showing card on a page that already has one
      if (document.getElementById('spaced-repetition-container')) {
          return;
      }
      showCard(message.card);
      sendResponse({ success: true });
    }
    return true; // Keep the message channel open for async responses
  });

  // Main function to display the card
  function showCard(card) {
    if (isCardVisible) {
      hideCard();
    }
    currentCard = card;
    createCardElement();
    isCardVisible = true;
  }

  // Format text to be safely displayed as HTML
  function formatText(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\\n|\n/g, '<br>');
  }

  // Create the card's HTML element and inject it into the page
  function createCardElement() {
    if (cardElement) {
      cardElement.remove();
    }

    cardElement = document.createElement('div');
    cardElement.id = 'spaced-repetition-container';

    const questionText = currentCard.question;
    const match = questionText.match(/^([\w\s-]+) — traduza para PT-BR/);
    const wordToSpeak = match ? match[1].trim() : null;

    let questionHTML;
    if (wordToSpeak) {
        questionHTML = `
            <div class="sr-question-inner">
                <span>${formatText(questionText)}</span>
                <button class="sr-speak-btn" data-word="${wordToSpeak}" aria-label="Ouvir palavra">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                </button>
            </div>
        `;
    } else {
        questionHTML = formatText(questionText);
    }

    cardElement.innerHTML = `
      <div class="sr-card">
        <div class="sr-card-header" id="sr-card-header">
          <span class="sr-card-title">Revisão Espaçada</span>
          <button class="sr-close-btn" id="sr-close-button" aria-label="Fechar Cartão">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="sr-card-body">
          <div class="sr-question" id="sr-question">${questionHTML}</div>
          <div class="sr-answer" id="sr-answer" style="display: none;">${formatText(currentCard.answer)}</div>
          <div class="sr-hint" id="sr-hint" style="display: none;">
            <span class="sr-hint-icon">💡</span>
            <span>${formatText(currentCard.hint || 'Sem dica disponível')}</span>
          </div>
        </div>
        
        <div class="sr-card-footer">
          <div class="sr-card-actions" id="sr-card-actions">
            <button class="sr-btn sr-btn-secondary" id="sr-hint-button">Dica</button>
            <button class="sr-btn sr-btn-primary" id="sr-flip-button">Virar</button>
          </div>
          <div class="sr-answer-buttons" id="sr-answer-buttons" style="display: none;">
             <button class="sr-btn sr-btn-error" id="sr-wrong-button">Errei</button>
             <button class="sr-btn sr-btn-success" id="sr-correct-button">Acertei</button>
          </div>
        </div>
      </div>
    `;

    if (document.body) {
      document.body.appendChild(cardElement);
      setupEventListeners();
    }
  }
  
  // Handle text-to-speech for a word
  function handleSpeak(e) {
    const button = e.currentTarget;
    const word = button.dataset.word;
    if (word && window.speechSynthesis) {
        button.blur(); // Remove focus after click
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
    }
  }

  // Set up event listeners for the card's interactive elements
  function setupEventListeners() {
    document.getElementById('sr-close-button')?.addEventListener('click', hideCard);
    document.getElementById('sr-hint-button')?.addEventListener('click', toggleHint);
    document.getElementById('sr-flip-button')?.addEventListener('click', flipCard);
    document.getElementById('sr-wrong-button')?.addEventListener('click', () => markAnswer(false));
    document.getElementById('sr-correct-button')?.addEventListener('click', () => markAnswer(true));
    document.querySelector('.sr-speak-btn')?.addEventListener('click', handleSpeak);
    makeDraggable();
  }

  // Make the card draggable by its header
  function makeDraggable() {
    const header = document.getElementById('sr-card-header');
    const container = document.getElementById('spaced-repetition-container');
    if (!header || !container) return;

    let isDragging = false;
    let offsetX, offsetY;

    const onMouseDown = (e) => {
      isDragging = true;
      offsetX = e.clientX - container.offsetLeft;
      offsetY = e.clientY - container.offsetTop;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      container.style.left = `${e.clientX - offsetX}px`;
      container.style.top = `${e.clientY - offsetY}px`;
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    header.addEventListener('mousedown', onMouseDown);
  }

  // Toggle the card between question and answer
  function flipCard() {
    const question = document.getElementById('sr-question');
    const answer = document.getElementById('sr-answer');
    const answerButtons = document.getElementById('sr-answer-buttons');
    const cardActions = document.getElementById('sr-card-actions');
    
    if (!question || !answer || !answerButtons || !cardActions) return;

    const isAnswerHidden = answer.style.display === 'none';
    question.style.display = isAnswerHidden ? 'none' : 'block';
    answer.style.display = isAnswerHidden ? 'block' : 'none';
    answerButtons.style.display = isAnswerHidden ? 'flex' : 'none';
    cardActions.style.display = isAnswerHidden ? 'none' : 'flex';
  }

  // Toggle the visibility of the hint
  function toggleHint() {
    const hint = document.getElementById('sr-hint');
    if (!hint) return;
    
    hint.style.display = hint.style.display === 'none' ? 'flex' : 'none';
  }

  // Mark the answer as correct or incorrect and send to background
  function markAnswer(isCorrect) {
    if (!currentCard) return;

    const card = cardElement?.querySelector('.sr-card');
    if (card) {
      card.classList.add(isCorrect ? 'sr-correct' : 'sr-incorrect');
      createFeedbackOverlay(card, isCorrect);
      if (isCorrect) {
        createParticleEffect(card);
      }
    }

    chrome.runtime.sendMessage({
      action: 'updateCard',
      cardId: currentCard.id,
      correct: isCorrect
    });

    setTimeout(hideCard, 1500); // Hide card after feedback animation
  }

  // Create a visual feedback overlay (e.g., checkmark or X)
  function createFeedbackOverlay(card, isCorrect) {
    const overlay = document.createElement('div');
    overlay.className = 'sr-feedback-overlay';
    
    const icon = document.createElement('div');
    icon.className = 'sr-feedback-icon';
    if (isCorrect) {
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="#28a745"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`;
    } else {
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="#dc3545"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
    }
    
    overlay.appendChild(icon);
    card.appendChild(overlay);

    setTimeout(() => overlay.remove(), 1200);
  }

  // Create a particle effect for correct answers
  function createParticleEffect(card) {
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'sr-particles';
    
    for (let i = 0; i < 15; i++) {
      const particle = document.createElement('div');
      particle.className = 'sr-particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 0.5}s`;
      particlesContainer.appendChild(particle);
    }
    
    card.appendChild(particlesContainer);

    setTimeout(() => particlesContainer.remove(), 1500);
  }

  // Remove the card from the page
  function hideCard() {
    if (cardElement) {
      cardElement.style.animation = 'card-disappear 0.3s ease-out forwards';
      cardElement.addEventListener('animationend', () => {
          cardElement.remove();
          cardElement = null;
      });
    } else {
        const existingCard = document.getElementById('spaced-repetition-container');
        if (existingCard) {
            existingCard.remove();
        }
    }
    isCardVisible = false;
    currentCard = null;
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes card-disappear {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(20px) scale(0.95); }
    }
  `;
  document.head.appendChild(style);
}