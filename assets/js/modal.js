let modalOutsideClickBound = false;

function showContactModal(message) {
  const modal = document.getElementById('emailSentModal');
  const messageElement = document.getElementById('contact-form-message');
  if (!modal || !messageElement) {
    return;
  }

  messageElement.textContent = message;
  modal.style.display = 'block';

  const closeButton = document.getElementsByClassName('close-button')[0];
  if (closeButton) {
    closeButton.onclick = function () {
      modal.style.display = 'none';
    };
  }

  if (!modalOutsideClickBound) {
    window.addEventListener('click', function (event) {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
    modalOutsideClickBound = true;
  }
}

document
  .getElementById('contact-form')
  ?.addEventListener('submit', async function (event) {
    event.preventDefault();

    const form = event.target;
    const button = form.querySelector('button[type="submit"]');
    const originalButtonText = button ? button.textContent : '';
    const formData = new FormData(form);

    if (button) {
      button.disabled = true;
      button.textContent = 'Sending...';
    }

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString(),
      });

      if (!response.ok) {
        throw new Error(`Contact form failed with status ${response.status}`);
      }

      form.reset();
      showContactModal('Your message has been sent successfully. Thank you!');
    } catch (error) {
      console.error('Contact form submission failed', error);
      showContactModal(
        'Sorry, your message could not be sent. Please try again later.',
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalButtonText;
      }
    }
  });
