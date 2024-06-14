export function indicateElementSuccess(select: HTMLElement, success: boolean) {
  const originalBackgroundColor = select.style.backgroundColor;

  select.style.backgroundColor = success ? "#d0edce" : "#f8d7da";

  setTimeout(() => {
    select.style.backgroundColor = originalBackgroundColor;
  }, 2000);
}

export function indicateButtonSuccess(button: HTMLElement, success: boolean) {
  const className = success ? "btn-success" : "btn-danger";

  button.classList.add(className);

  setTimeout(() => {
    button.classList.remove(className);
  }, 2000);
}
