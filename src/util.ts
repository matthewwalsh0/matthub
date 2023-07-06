export function indicateElementSuccess(select: HTMLElement, success: boolean) {
  const originalBackgroundColor = select.style.backgroundColor;

  select.style.backgroundColor = success ? "#d0edce" : "#f8d7da";

  setTimeout(() => {
    select.style.backgroundColor = originalBackgroundColor;
  }, 2000);
}
