const recipeForm = document.getElementById('recipe-form');
const recipeError = document.getElementById('recipe-error');
const recipeSuccess = document.getElementById('recipe-success');
const recipeButton = recipeForm.querySelector('button[type="submit"]');
const unavailableMessage = 'The recipe download is not available yet. Please try again later.';

recipeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!recipeForm.reportValidity()) return;

  recipeError.hidden = true;
  recipeButton.disabled = true;
  recipeButton.textContent = 'Just a moment...';

  try {
    const pdf = await fetch('/assets/fairyland-soda_bread.pdf', { method: 'HEAD', cache: 'no-store' });
    if (!pdf.ok || !pdf.headers.get('content-type')?.toLowerCase().startsWith('application/pdf')) {
      throw new Error(unavailableMessage);
    }

    const response = await fetch('/.netlify/functions/recipe-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: recipeForm.elements.first_name.value.trim(),
        email: recipeForm.elements.email.value.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error('We could not complete your signup. Please check your details and try again later.');
    }

    recipeForm.hidden = true;
    recipeSuccess.hidden = false;
    recipeSuccess.focus();
  } catch (error) {
    console.error('Recipe signup failed:', error);
    recipeError.textContent = error.message === unavailableMessage
      ? unavailableMessage
      : 'We could not complete your signup. Please check your details and try again later.';
    recipeError.hidden = false;
  } finally {
    recipeButton.disabled = false;
    recipeButton.textContent = 'Get the free bread recipe';
  }
});
