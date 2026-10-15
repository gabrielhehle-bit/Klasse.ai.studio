// Guard the multi-step student editor against an unintended submit while the
// "Weiter" button is reconciled into the final submit button.
//
// In React the same DOM button can be reused when switching from step 2
// (Pädagogik) to step 3 (Kontakte). During the same click it may therefore
// change from type="button" to type="submit" before the browser runs the
// default click action, which can submit the form immediately. Cancelling the
// default action for the navigation button keeps the click purely navigational;
// React's onClick handler still advances the section normally.
function guardStudentFormStepClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const button = target.closest<HTMLButtonElement>('button');
  if (!button) return;
  if (button.textContent?.trim() !== 'Weiter') return;

  const dialog = button.closest('[role="dialog"]');
  if (!dialog?.querySelector('#student-form')) return;

  event.preventDefault();
}

document.addEventListener('click', guardStudentFormStepClick, true);
