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
    const firstName = form.querySelector('[name="first_name"]')?.value || '';
    const lastName = form.querySelector('[name="last_name"]')?.value || '';
    const nameInput = form.querySelector('[name="name"]');
    const originalButtonText = button ? button.textContent : '';

    if (nameInput) {
      nameInput.value = `${firstName} ${lastName}`.trim();
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Sending...';
    }

    try {
      if (!window.emailjs) {
        throw new Error('EmailJS is not available.');
      }

      await emailjs.sendForm('service_bmxa104', 'template_468hws4', form);
      form.reset();
      showContactModal('Your message has been sent successfully. Thank you!');
    } catch (error) {
      console.error('EmailJS send failed', error);
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
